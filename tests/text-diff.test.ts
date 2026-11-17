/**
 * 文件：tests/text-diff.test.ts
 * 描述：行级 diff 的回归测试：增删/相同行、CJK、CRLF、空输入、2000 行截断与确定性
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（V4 P3 §7.6）。先钉住四条口径：行级比较、CJK 整行不丢字、
 *               CRLF 归一、超过 2000 行截断并置 truncated。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { diffLines } from "../src/lib/text-diff.ts";

test("相同输入全部为 same，且顺序不变", () => {
  const { lines, truncated } = diffLines("a\nb\nc", "a\nb\nc");

  assert.equal(truncated, false);
  assert.deepEqual(
    lines.map((line) => [line.kind, line.text]),
    [["same", "a"], ["same", "b"], ["same", "c"]],
  );
});

test("新增与删除行各自标成 add / remove，CJK 不丢字", () => {
  const { lines } = diffLines("第一行\n旧的第二行\n第三行", "第一行\n新的第二行\n第三行");
  const kinds = lines.map((line) => line.kind);

  assert.deepEqual(kinds, ["same", "remove", "add", "same"]);
  assert.equal(lines[1].text, "旧的第二行");
  assert.equal(lines[2].text, "新的第二行");
});

test("CRLF 与 LF 视为同一行，不产生伪差异", () => {
  const { lines } = diffLines("a\r\nb", "a\nb");

  assert.deepEqual(lines.map((line) => line.kind), ["same", "same"]);
});

test("空字符串不产生一行空内容", () => {
  assert.deepEqual(diffLines("", "").lines, []);
  assert.deepEqual(diffLines("", "a").lines, [{ kind: "add", text: "a" }]);
  assert.deepEqual(diffLines("a", "").lines, [{ kind: "remove", text: "a" }]);
});

test("超过 2000 行时截断并置 truncated，输出仍确定", () => {
  const long = Array.from({ length: 2005 }, (_, i) => `line-${i}`).join("\n");
  const first = diffLines(long, long);
  const second = diffLines(long, long);

  assert.equal(first.truncated, true);
  assert.equal(first.lines.length, 2000);
  assert.deepEqual(first, second);
});
