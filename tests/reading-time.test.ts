/**
 * 文件：tests/reading-time.test.ts
 * 描述：阅读时长纯函数的回归测试：空文、中文阈值、Markdown 剥离与中英混排
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。阈值按 400 字/分钟锁定，避免以后改常数悄悄改变页面文案
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateReadingMinutes } from "../src/lib/reading-time.ts";

const cjk = (count: number) => "字".repeat(count);

test("空正文与纯空白返回 0", () => {
  assert.equal(estimateReadingMinutes(""), 0);
  assert.equal(estimateReadingMinutes("   \n\t"), 0);
});

test("不足 400 字按 1 分钟计", () => {
  assert.equal(estimateReadingMinutes(cjk(1)), 1);
  assert.equal(estimateReadingMinutes(cjk(400)), 1);
  assert.equal(estimateReadingMinutes(cjk(401)), 2);
});

test("代码块与图片不计入阅读量", () => {
  const code = "```ts\n" + "const value = 1;\n".repeat(200) + "```";
  const image = "![截图](./a.png)";
  assert.equal(estimateReadingMinutes(`${code}\n${image}`), 0);
});

test("Markdown 结构字符不会抬高分钟数", () => {
  const plain = cjk(398);
  assert.equal(estimateReadingMinutes(`## 标题\n\n${plain}`), 1);
  assert.equal(estimateReadingMinutes(`> ${cjk(400)}`), 1);
});

test("中英混排按词折算，英文不会归零", () => {
  const english = "word ".repeat(200);
  assert.equal(estimateReadingMinutes(english), 1);
});

test("链接只算锚文本，不算 URL", () => {
  assert.equal(estimateReadingMinutes("[短](https://example.com/very/long/path)"), 1);
});
