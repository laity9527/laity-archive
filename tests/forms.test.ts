/**
 * 文件：tests/forms.test.ts
 * 描述：表单与查询参数工具的回归测试：slug 规则的边界、数组型参数、FormData 取值与裁剪
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（slug 规则同时被日志、项目与 Proxy 使用，改一处会牵动前台 404 判定）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { SLUG_PATTERN, pickParam, readField } from "../src/lib/forms.ts";

test("pickParam 只认非空字符串", () => {
  assert.equal(pickParam("abc"), "abc");
  assert.equal(pickParam(""), undefined);
  assert.equal(pickParam(undefined), undefined);
  // 同名参数出现两次时框架给数组，此时按缺省处理而不是取第一个
  assert.equal(pickParam(["a", "b"]), undefined);
});

test("readField 取不到或类型不对时返回空串，并去掉首尾空白", () => {
  const data = new FormData();

  data.append("slug", "  earth-mirror  ");
  data.append("empty", "");
  data.append("blob", new Blob(["x"]), "name");

  assert.equal(readField(data, "slug"), "earth-mirror");
  assert.equal(readField(data, "empty"), "");
  assert.equal(readField(data, "missing"), "");
  assert.equal(readField(data, "blob"), "");
});

test("slug 规则：2 到 64 位小写字母数字与连字符，首字符不能是连字符", () => {
  assert.ok(SLUG_PATTERN.test("earth-mirror"));
  assert.ok(SLUG_PATTERN.test("a0"));
  assert.ok(SLUG_PATTERN.test("x".repeat(64)));
  assert.ok(SLUG_PATTERN.test("9lives"));

  assert.equal(SLUG_PATTERN.test("x".repeat(65)), false);
  assert.equal(SLUG_PATTERN.test("a"), false);
  assert.equal(SLUG_PATTERN.test(""), false);
  assert.equal(SLUG_PATTERN.test("-lead"), false);
  assert.equal(SLUG_PATTERN.test("Earth"), false);
  assert.equal(SLUG_PATTERN.test("under_score"), false);
  assert.equal(SLUG_PATTERN.test("dot.suffix"), false);
  // 目录穿越与路径分隔符必须进不来
  assert.equal(SLUG_PATTERN.test("../../etc/passwd"), false);
});
