/**
 * 文件：tests/text-stats.test.ts
 * 描述：编辑器字数统计的回归测试：中文按字、拉丁按词、中英紧邻不合并、标点与空串不计
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。字数统计本轮从 Editor.tsx 抽成纯函数，先用测试把口径钉死，
 *               避免以后“看起来差不多”的改动让编辑器显示的数字漂移
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { countBodyChars } from "../src/lib/text-stats.ts";

test("纯中文按字计", () => {
  assert.equal(countBodyChars("修复两次"), 4);
});

test("纯英文按词计，连字符与标点不额外计数", () => {
  assert.equal(countBodyChars("fix the bug."), 3);
  assert.equal(countBodyChars("container-query"), 2);
});

test("中英混合分别计数", () => {
  // 中文 4 + 拉丁 1
  assert.equal(countBodyChars("修复 bug 两次"), 5);
});

test("中英紧邻时不被算成一个词", () => {
  // “中文abc英文” → 中文 4 + abc 1
  assert.equal(countBodyChars("中文abc英文"), 5);
});

test("版本号按字母数字段计", () => {
  // v4 / 3 / 3
  assert.equal(countBodyChars("v4.3.3"), 3);
});

test("空串、空白与纯符号都返回 0", () => {
  assert.equal(countBodyChars(""), 0);
  assert.equal(countBodyChars(" \n\t"), 0);
  assert.equal(countBodyChars("——「」!?"), 0);
});

test("换行与 Markdown 标记不影响中文计数", () => {
  // 中文 4（标题 + 粗体）；“## ” 与 “**” 不计
  assert.equal(countBodyChars("## 标题\n**粗体**"), 4);
});
