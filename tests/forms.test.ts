/**
 * 文件：tests/forms.test.ts
 * 描述：表单与查询参数工具的回归测试：slug 规则的边界、数组型参数、FormData 取值与裁剪
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（slug 规则同时被日志、项目与 Proxy 使用，改一处会牵动前台 404 判定）
 * - 2026-11-04: 补 ID_PATTERN、LIMITS 与 safeCallbackUrl 三组判定（D26：反斜杠写法的回调此前能绕过），
 *               以及 SLUG_SOURCE 在浏览器 `v` flag 下的可编译性——上一轮把正则 source 直接写进 pattern 属性，
 *               浏览器控制台报 Invalid character class，由这条测试钉住
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITS, SLUG_PATTERN, SLUG_SOURCE, ID_PATTERN, pickParam, readField, safeCallbackUrl } from "../src/lib/forms.ts";

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

// 属性 pattern 由浏览器按 `v` flag 编译，类名里尾随的 - 在那儿是非法字符类：
// 直接把正则字面量的 source 塞进 pattern 会报错（实测浏览器 console 报 Invalid character class），
// 所以服务端与浏览器共用 SLUG_SOURCE 这一份，改这里必须两侧同时成立
test("SLUG_SOURCE 在服务端正则与浏览器 pattern 两种编译下都合法", () => {
  assert.equal(SLUG_PATTERN.source, `^${SLUG_SOURCE}$`);
  assert.ok(new RegExp(`^(?:${SLUG_SOURCE})$`, "v").test("earth-mirror"));
  assert.equal(new RegExp(`^(?:${SLUG_SOURCE})$`, "v").test("-lead"), false);
  assert.equal(new RegExp(`^(?:${SLUG_SOURCE})$`, "v").test("Earth"), false);
  assert.doesNotThrow(() => new RegExp(`^(?:${SLUG_SOURCE})$`, "v"));
});

test("id 规则挡得住拼进 redirect 的脏值", () => {
  assert.ok(ID_PATTERN.test("cmvumq9sg0000v694od3pjlxx"));
  assert.equal(ID_PATTERN.test(""), false);
  assert.equal(ID_PATTERN.test("../etc/passwd"), false);
  assert.equal(ID_PATTERN.test("has space"), false);
  assert.equal(ID_PATTERN.test("UPPER"), false);
  assert.equal(ID_PATTERN.test("z".repeat(65)), false);
});

// 这些数字同时被服务端校验、HTML 的 maxLength 与文案表引用；改一处要三处一致，所以钉在这里
test("LIMITS 与 SPEC 写的上限一致", () => {
  assert.equal(LIMITS.title, 120);
  assert.equal(LIMITS.tags, 10);
  assert.equal(LIMITS.tag, 24);
  assert.equal(LIMITS.lesson, 500);
  assert.equal(LIMITS.projectName, 80);
  assert.equal(LIMITS.projectSummary, 200);
});

test("回调地址只认本站相对路径，反斜杠写法也挡掉", () => {
  assert.equal(safeCallbackUrl("/admin/projects"), "/admin/projects");
  assert.equal(safeCallbackUrl("/admin/logs/new"), "/admin/logs/new");

  // 旧实现只挡 //host，漏了 /\host——WHATWG 解析把反斜杠当路径分隔符，等价于跳外站
  assert.equal(safeCallbackUrl("/\\evil.com"), "/admin");
  assert.equal(safeCallbackUrl("//evil.com"), "/admin");
  assert.equal(safeCallbackUrl("/a/\\evil.com"), "/admin");
  assert.equal(safeCallbackUrl("https://evil.com"), "/admin");
  assert.equal(safeCallbackUrl("javascript:alert(1)"), "/admin");
  assert.equal(safeCallbackUrl(""), "/admin");
  assert.equal(safeCallbackUrl(undefined), "/admin");
});
