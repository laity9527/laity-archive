/**
 * 文件：tests/error-text.test.ts
 * 描述：错误码文案表的回归测试：每个 SPEC 错误码都要有文案，未知码原样回落成码本身
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ERROR_TEXT, errorTextOf } from "../src/lib/error-text.ts";

const SPEC_CODES = ["AUTH_001", "VAL_001", "LOG_001", "LOG_002", "PRJ_001", "PRJ_002", "IMG_001"];

test("SPEC 里的每个错误码都有文案（除按表单分支的 VAL_001）", () => {
  for (const code of SPEC_CODES.filter((c) => c !== "VAL_001")) {
    assert.ok(ERROR_TEXT[code]?.length, `${code} 缺文案`);
  }
});

test("登录侧四个码也在同一张表里", () => {
  for (const code of ["AccessDenied", "Verification", "Configuration", "Default"]) {
    assert.ok(ERROR_TEXT[code]?.length, `${code} 缺文案`);
  }
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
