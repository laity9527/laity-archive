/**
 * 文件：tests/error-text.test.ts
 * 描述：错误码文案表的回归测试：每个 SPEC 错误码都要有文案，未知码原样回落成码本身
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 * - 2026-11-04: 登录侧码表随口令登录调整：AccessDenied → CredentialsSignin
 * - 2026-11-04: 补 PRJ_003/PRJ_004、逐字段文案完整性，以及 Configuration 不得念出环境变量名（D26）
 * - 2026-11-10: I078：口令时代的 CredentialsSignin 已删，登录侧断言改为 OAuth 六个码 + Configuration/Default
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ERROR_TEXT, errorTextOf } from "../src/lib/error-text.ts";

const SPEC_CODES = [
  "AUTH_001",
  "VAL_001",
  "LOG_001",
  "LOG_002",
  "PRJ_001",
  "PRJ_002",
  "PRJ_003",
  "PRJ_004",
  "IMG_001",
];

const OAUTH_CODES = [
  "OAuthSignin",
  "AccessDenied",
  "OAuthCallback",
  "OAuthCreateAccount",
  "OAuthAccountNotLinked",
  "Callback",
  "Configuration",
  "Default",
];

test("SPEC 里的每个错误码都有文案（除按表单分支的 VAL_001）", () => {
  for (const code of SPEC_CODES.filter((c) => c !== "VAL_001")) {
    assert.ok(ERROR_TEXT[code]?.length, `${code} 缺文案`);
  }
});

test("OAuth 链路的六个码 + Configuration/Default 都在同一张表里", () => {
  for (const code of OAUTH_CODES) {
    assert.ok(ERROR_TEXT[code]?.length, `${code} 缺文案`);
  }
});

test("口令时代的码已经不再出现", () => {
  assert.equal(ERROR_TEXT.CredentialsSignin, undefined);
});

test("VAL_001 按来源表单给不同细则", () => {
  const log = errorTextOf("VAL_001", "log");
  const project = errorTextOf("VAL_001", "project");

  assert.match(log, /标题必填/);
  assert.match(project, /名称必填/);
  assert.notEqual(log, project);
  // 没带来源时给中性文案，不能拿日志表单的规则去提示项目表单
  assert.equal(errorTextOf("VAL_001"), "参数不合法，请检查表单。");
});

test("未知码原样回落成码本身，不显示 undefined", () => {
  assert.equal(errorTextOf("SOMETHING_NEW"), "SOMETHING_NEW");
  assert.doesNotMatch(errorTextOf("SOMETHING_NEW"), /undefined/);
});

test("IMG_001 文案与操作说明书里引用的那句完全一致", () => {
  assert.equal(
    ERROR_TEXT.IMG_001,
    "图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。",
  );
});

// 这一行渲染在公开的 /login 上（?error=Configuration 任何人敲得到），配置状态属于服务器侧信息
test("Configuration 文案不念出环境变量名", () => {
  const text = ERROR_TEXT.Configuration;

  assert.doesNotMatch(text, /NEXTAUTH|SECRET|_URL|ADMIN_PASSWORD/i);
  assert.ok(text.length > 0);
});

test("VAL_001 带 field 时给具体那一条，而不是复述整张表单的规则", () => {
  assert.equal(errorTextOf("VAL_001", "log", "title"), "标题必填，且不超过 120 字。");
  assert.match(errorTextOf("VAL_001", "project", "name"), /80 字/);

  // 只说标题的不能再带上 slug 的规则，否则用户不知道错在哪
  const title = errorTextOf("VAL_001", "log", "title");

  assert.doesNotMatch(title, /slug/);
});

test("field 不认识或缺失时回落到整句，绝不出现 undefined", () => {
  const fallback = errorTextOf("VAL_001", "log", "not_a_field");

  assert.match(fallback, /标题必填/);
  assert.doesNotMatch(fallback, /undefined/);
  assert.doesNotMatch(errorTextOf("VAL_001", undefined, "title"), /undefined/);
});
