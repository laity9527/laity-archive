/**
 * 文件：tests/highlight.test.ts
 * 描述：高亮纯函数回归测试：大小写不敏感切分、保留原文大小写、片段窗口边界不变量、正则特殊字符按字面处理
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F24 搜索关键词高亮 Commit 1）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractSnippet, highlightSegments } from "../src/lib/highlight.ts";

test("大小写不敏感：查询与文本大小写不同也要切出命中段", () => {
  assert.deepEqual(highlightSegments("Fix Login Bug", "login"), [
    { text: "Fix ", match: false },
    { text: "Login", match: true },
    { text: " Bug", match: false },
  ]);
});

test("保留原文大小写：命中段取自原文而非小写化后的查询", () => {
  const segs = highlightSegments("Next.js 16.4.3 release notes", "16.4.3");
  assert.deepEqual(segs, [
    { text: "Next.js ", match: false },
    { text: "16.4.3", match: true },
    { text: " release notes", match: false },
  ]);
  assert.equal(segs.map((s) => s.text).join(""), "Next.js 16.4.3 release notes");
});

test("多个命中切成交替段，相邻命中不合并", () => {
  assert.deepEqual(highlightSegments("aXaXa", "x"), [
    { text: "a", match: false },
    { text: "X", match: true },
    { text: "a", match: false },
    { text: "X", match: true },
    { text: "a", match: false },
  ]);
});

test("空查询与纯空白查询不切分，返回单段不命中", () => {
  assert.deepEqual(highlightSegments("anything", ""), [{ text: "anything", match: false }]);
  assert.deepEqual(highlightSegments("anything", "   "), [{ text: "anything", match: false }]);
});

test("无命中返回单段不命中", () => {
  assert.deepEqual(highlightSegments("hello world", "xyz"), [
    { text: "hello world", match: false },
  ]);
});

test("正则特殊字符按字面处理（查询不进正则构造）", () => {
  assert.deepEqual(highlightSegments("cost is a.b(* 100", "a.b(*"), [
    { text: "cost is ", match: false },
    { text: "a.b(*", match: true },
    { text: " 100", match: false },
  ]);
});

test("中文关键词正常切分", () => {
  assert.deepEqual(highlightSegments("搜索关键词高亮方案已批准", "高亮"), [
    { text: "搜索关键词", match: false },
    { text: "高亮", match: true },
    { text: "方案已批准", match: false },
  ]);
});

test("片段窗口：越界侧才出现省略号，窗口内文本取自原文", () => {
  const text = "x".repeat(50) + "55" + "y".repeat(50);
  const hit = text.indexOf("55");
  const snip = extractSnippet(text, "55", 10);
  assert.ok(snip);
  assert.equal(snip.leadingEllipsis, true);
  assert.equal(snip.trailingEllipsis, true);
  assert.equal(snip.segments.map((s) => s.text).join(""), text.slice(hit - 10, hit + 2 + 10));
  assert.ok(snip.segments.some((s) => s.match && s.text === "55"));
});

test("片段窗口边界不变量：被切口截断的关键词不产生半个命中段", () => {
  const keyword = "SECRET";
  const text = "x".repeat(10) + keyword + keyword + "y".repeat(10);
  const snip = extractSnippet(text, keyword, 4);
  assert.ok(snip);
  // 窗口 = [首命中 10-4, 10+6+4] = [6, 20]：第二个 SECRET 被截成 "SECR" 留在窗口尾
  assert.equal(snip.leadingEllipsis, true);
  assert.equal(snip.trailingEllipsis, true);
  assert.equal(snip.segments.map((s) => s.text).join(""), "xxxx" + keyword + "SECR");
  const marked = snip.segments.filter((s) => s.match).map((s) => s.text).join("");
  assert.equal(marked, keyword);
  for (const seg of snip.segments) {
    if (seg.match) assert.equal(seg.text.length, keyword.length);
  }
});

test("片段位于文本首/尾时只补被截断一侧的省略号", () => {
  const head = extractSnippet("SECRET " + "y".repeat(100), "SECRET", 60);
  assert.ok(head);
  assert.equal(head.leadingEllipsis, false);
  assert.equal(head.trailingEllipsis, true);

  const tail = extractSnippet("x".repeat(100) + "SECRET", "SECRET", 60);
  assert.ok(tail);
  assert.equal(tail.leadingEllipsis, true);
  assert.equal(tail.trailingEllipsis, false);

  const whole = extractSnippet("SECRET", "SECRET", 60);
  assert.ok(whole);
  assert.equal(whole.leadingEllipsis, false);
  assert.equal(whole.trailingEllipsis, false);
});

test("片段无命中或空查询时返回 null", () => {
  assert.equal(extractSnippet("hello world", "xyz"), null);
  assert.equal(extractSnippet("hello world", ""), null);
  assert.equal(extractSnippet("", "x"), null);
});

test("与 matchLog 口径一致：匹配上的文本必有高亮段（同用 toLowerCase）", async () => {
  const { matchLog } = await import("../src/lib/log-search.ts");
  for (const text of ["Next.js 16.4.3", "Fix LOGIN bug", "中文关键词测试", "a.b(* special"]) {
    const query = text.slice(0, 3);
    const log = { title: text, beforeContent: "", afterContent: null, tags: [] };
    assert.equal(matchLog(log, query), true, `matchLog 应判定命中：${text}`);
    const segs = highlightSegments(text, query);
    assert.ok(segs.some((s) => s.match), `命中必有高亮段：${text}`);
  }
});
