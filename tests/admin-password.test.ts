/**
 * 文件：tests/admin-password.test.ts
 * 描述：后台口令判定的回归测试：未配置一律拒绝、空输入拒绝、大小写敏感、只裁配置值不裁输入，以及登录节流窗口
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（取消 GitHub 登录后接管准入判据）
 * - 2026-11-04: 补登录节流用例：窗口内计数、过期恢复、按来源隔离、成功即清零、XFF 取第一跳
 * - 2026-11-04: 补两条过期清理与桶数上限的用例（I063：键是 XFF 首跳，应用被直连暴露时可伪造，
 *               旧桶以前永不删除）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  adminPasswordConfigured,
  attemptsLeft,
  clearLoginFailures,
  loginBucketCount,
  passwordMatches,
  registerFailure,
  throttleKeyOf,
} from "../src/lib/admin-password.ts";

// 哑值，只为验证判定逻辑；真实口令只在各环境的 .env 里，不进仓库也不进断言
const DUMMY = "dev-dummy-password";

function withEnv<T>(value: string | undefined, run: () => T): T {
  const before = process.env.ADMIN_PASSWORD;

  if (value === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = value;
  }

  try {
    return run();
  } finally {
    if (before === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = before;
    }
  }
}

test("未配置口令时什么都不放行", () => {
  assert.equal(withEnv(undefined, () => adminPasswordConfigured()), false);
  assert.equal(withEnv(undefined, () => passwordMatches(DUMMY)), false);
  // 空配置不等于万能口令
  assert.equal(withEnv("", () => passwordMatches("")), false);
  assert.equal(withEnv("   ", () => passwordMatches("")), false);
});

test("正确口令通过，改一个字符就失败", () => {
  assert.equal(withEnv(DUMMY, () => passwordMatches(DUMMY)), true);
  assert.equal(withEnv(DUMMY, () => passwordMatches(`${DUMMY}x`)), false);
  assert.equal(withEnv(DUMMY, () => passwordMatches(DUMMY.slice(0, -1))), false);
});

test("空输入与缺失输入一律拒绝", () => {
  assert.equal(withEnv(DUMMY, () => passwordMatches("")), false);
  assert.equal(withEnv(DUMMY, () => passwordMatches(null)), false);
  assert.equal(withEnv(DUMMY, () => passwordMatches(undefined)), false);
});

test("口令区分大小写", () => {
  assert.equal(withEnv(DUMMY, () => passwordMatches(DUMMY.toUpperCase())), false);
});

test("只裁配置值的首尾空白，输入原样比对", () => {
  assert.equal(withEnv(`  ${DUMMY}  `, () => adminPasswordConfigured()), true);
  assert.equal(withEnv(`  ${DUMMY}  `, () => passwordMatches(DUMMY)), true);
  assert.equal(withEnv(DUMMY, () => passwordMatches(` ${DUMMY}`)), false);
});

const T0 = 1_800_000_000_000;

test("窗口内失败计满就拒绝，计不满还留额度", () => {
  const key = "throttle-basic";

  clearLoginFailures(key);
  assert.equal(attemptsLeft(key, T0), LOGIN_MAX_FAILURES);

  for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i += 1) {
    registerFailure(key, T0);
  }

  assert.equal(attemptsLeft(key, T0), 1);

  registerFailure(key, T0);
  assert.equal(attemptsLeft(key, T0), 0);
  // 再失败也不该把额度记成负数
  registerFailure(key, T0);
  assert.equal(attemptsLeft(key, T0), 0);
});

test("窗口过期自动恢复，不需要清理任务", () => {
  const key = "throttle-window";

  clearLoginFailures(key);

  for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
    registerFailure(key, T0);
  }

  assert.equal(attemptsLeft(key, T0), 0);
  assert.equal(attemptsLeft(key, T0 + LOGIN_WINDOW_MS - 1), 0);
  assert.equal(attemptsLeft(key, T0 + LOGIN_WINDOW_MS), LOGIN_MAX_FAILURES);
  // 过期后的第一次失败重开新窗口，而不是接着旧窗口计数
  registerFailure(key, T0 + LOGIN_WINDOW_MS);
  assert.equal(attemptsLeft(key, T0 + LOGIN_WINDOW_MS), LOGIN_MAX_FAILURES - 1);
});

test("成功一次即清零该来源的计数，不同来源互不影响", () => {
  const a = "throttle-ip-a";
  const b = "throttle-ip-b";

  clearLoginFailures(a);
  clearLoginFailures(b);

  for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
    registerFailure(a, T0);
  }

  assert.equal(attemptsLeft(a, T0), 0);
  assert.equal(attemptsLeft(b, T0), LOGIN_MAX_FAILURES);

  clearLoginFailures(a);
  assert.equal(attemptsLeft(a, T0), LOGIN_MAX_FAILURES);
});

test("节流键取 X-Forwarded-For 的第一跳，缺头时落到 fallback", () => {
  assert.equal(throttleKeyOf("203.0.113.7, 10.0.0.1"), "203.0.113.7");
  assert.equal(throttleKeyOf("  203.0.113.8 "), "203.0.113.8");
  assert.equal(throttleKeyOf(["203.0.113.9", "x"]), "203.0.113.9");
  assert.equal(throttleKeyOf(undefined), "local");
  assert.equal(throttleKeyOf(""), "local");
  assert.equal(throttleKeyOf(" , x"), "local");
});

// 旧实现里桶只在被读到时判过期，过期项永远留在 Map 中；而键取 XFF 首跳，
// 应用被直接暴露时那串可以每次换一个，计数表就变成无界内存增长（I063）
test("记账会顺带清掉窗口已过期的来源桶", () => {
  const base = loginBucketCount();

  registerFailure("198.51.100.201", T0);
  registerFailure("198.51.100.202", T0);
  assert.equal(loginBucketCount(), base + 2);

  // 窗口走光之后再记一次：那两个旧桶应当被扫掉
  registerFailure("198.51.100.203", T0 + LOGIN_WINDOW_MS);

  assert.ok(
    loginBucketCount() <= base + 1,
    `过期桶没被清：当前 ${loginBucketCount()}，基线 ${base}`,
  );
});

test("来源桶数量有上限，伪造海量键也不会无界堆积", () => {
  for (let i = 0; i < 600; i += 1) {
    registerFailure(`203.0.113.${i}-bucket-${i}`, T0);
  }

  assert.ok(loginBucketCount() <= 512, `桶数失控：${loginBucketCount()}`);
});
