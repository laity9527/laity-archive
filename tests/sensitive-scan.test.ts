/**
 * 文件：tests/sensitive-scan.test.ts
 * 描述：发布前敏感信息扫描的回归测试：九类形态要命中，摘要/版本号/公网地址不许误判，邮箱只提示不拦发布
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（合规方案 2.2.3 的验收依据）
 * - 2026-11-11: 新增一条回归测试钉住「明文口令赋值」大小写不敏感（findAll 丢 /i 标志问题）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { hasBlockingHit, scanSensitive } from "../src/lib/sensitive-scan.ts";

const codes = (text: string) => scanSensitive(text).map((h) => h.code);

test("空文本不产生任何命中", () => {
  assert.deepEqual(scanSensitive(""), []);
});

test("手机号命中并计数", () => {
  const hits = scanSensitive("有事打我 13812345678，或 15998887777");
  const hit = hits.find((h) => h.code === "cnMobile");

  assert.ok(hit, "应识别出手机号");
  assert.equal(hit.count, 2);
});

test("身份证号命中（18 位含校验位 X）", () => {
  assert.ok(codes("身份证 " + "110101" + "19900307" + "775" + "X").includes("cnIdCard"));
});

// 夹具用运行时拼接，不在源文件里留下连续的凭据形态——否则 GitHub 的密钥扫描会当成真凭据拦推送或误报
const FAKE_AK = ["LTAI", "5tAbCdEfGh12345678"].join("");
const FAKE_JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV"].join(".");

test("阿里云与 AWS AccessKey ID 命中", () => {
  assert.ok(codes(`临时用了 ${FAKE_AK}`).includes("accessKey"));
  assert.ok(codes(["AKIA", "IOSFODNN7EXAMPLE"].join("")).includes("accessKey"));
});

test("GitHub 令牌命中", () => {
  assert.ok(codes("ghp_" + "A".repeat(36)).includes("githubToken"));
});

test("私钥块与 JWT 命中（都跨标点，必须走全文作用域）", () => {
  assert.ok(codes("-----BEGIN RSA PRIVATE KEY-----\nMIIEpA").includes("privateKey"));
  assert.ok(codes(`请求头带上 ${FAKE_JWT} 就行`).includes("jwt"));
});

test("明文口令赋值命中，等号两侧带空格也要抓到", () => {
  assert.ok(codes('password = "hunter2244xx"').includes("inlineSecret"));
  assert.ok(codes("api_key: sk-abcdef123456").includes("inlineSecret"));
});

test("明文口令赋值大小写不敏感（大写键名也要抓到）", () => {
  assert.ok(codes('Password = "hunter2244xx"').includes("inlineSecret"));
  assert.ok(codes("API_KEY: sk-abcdef123456").includes("inlineSecret"));
  assert.ok(codes('TOKEN="abcdef123456"').includes("inlineSecret"));
});

test("内网地址命中，公网地址不误判", () => {
  for (const ip of ["10.0.3.7", "192.168.1.20", "172.16.0.1", "172.31.255.9"]) {
    assert.ok(codes(`容器里是 ${ip}`).includes("privateIp"), `${ip} 应判为内网`);
  }

  for (const ip of ["8.8.8.8", "172.32.1.1", "1.1.1.1", "192.169.0.1"]) {
    assert.ok(!codes(ip).includes("privateIp"), `${ip} 不该判为内网`);
  }
});

test("64 位 contentHash 不误判为手机号", () => {
  assert.deepEqual(
    codes("a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5"),
    [],
  );
});

test("以手机号数字串开头的 40 位 SHA 不误判", () => {
  // 词元整体是十六进制摘要，必须跳过，否则 13812345678 会被当成手机号
  assert.ok(!codes("1381234567890abcdef1234567890abcdef1234").includes("cnMobile"));
});

test("版本号、日期与耗时不误判", () => {
  assert.deepEqual(codes("Next.js 16.4.3 发布于 2026-11-03，构建耗时 1234ms"), []);
});

test("邮箱归为提示级，且不构成阻截", () => {
  const hits = scanSensitive("有问题写信到 hi@laity.cn");
  const email = hits.find((h) => h.code === "email");

  assert.ok(email, "应识别出邮箱");
  assert.equal(email.advisory, true);
  assert.equal(hasBlockingHit(hits), false);
});

test("阻截级命中会把 hasBlockingHit 翻成 true", () => {
  assert.equal(hasBlockingHit(scanSensitive("我的手机 13812345678")), true);
});

test("命中片段打码，不外泄完整凭据", () => {
  const [hit] = scanSensitive(FAKE_AK);

  assert.ok(hit.samples[0].includes("…"), "样例应被截断打码");
  assert.ok(!hit.samples[0].includes("5tAbCdEfGh12345678"), "不得出现完整密钥");
});
