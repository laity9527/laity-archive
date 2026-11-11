/**
 * 文件：tests/toc.test.ts
 * 描述：extractToc 纯函数回归测试：12 条用例锁住与 markdown.tsx 盖 id 规则的对齐口径（F23/D34）
 * 作者：张磊
 * 创建日期：2026-11-11
 * 修改记录：
 * - 2026-11-11: 初始创建（三级序号、h4+ 不占号、围栏/缩进代码、收尾井号、行内剥离、setext、CRLF/CR、引用与列表、空态、多行 setext、前缀独立）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractToc } from "../src/lib/toc.ts";

test("三级标题按渲染序编号：id 前缀-0 起连续，level 记作者的井号数", () => {
  const items = extractToc("# 一\n\n## 二\n\n### 三", "t");
  assert.equal(items.length, 3);
  assert.deepEqual(items, [
    { id: "t-0", text: "一", level: 1 },
    { id: "t-1", text: "二", level: 2 },
    { id: "t-2", text: "三", level: 3 },
  ]);
});

test("h4–h6 不收录也不占号：与渲染器只给 h1/h2/h3 盖 id 对齐", () => {
  const items = extractToc("## 甲\n\n#### 四级\n\n##### 五级\n\n###### 六级\n\n## 乙", "t");
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.id), ["t-0", "t-1"]);
  assert.deepEqual(items.map((i) => i.text), ["甲", "乙"]);
});

test("围栏代码块内的井号不算标题：``` 与 ~~~、带信息串、长围栏只认同长度闭合", () => {
  const source =
    "```\n# 不是标题\n```\n\n## 真标题\n\n~~~js\n## 也不是\n~~~\n\n````\n```\n### 长围栏内\n````\n\n### 尾";
  const items = extractToc(source, "t");
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.text), ["真标题", "尾"]);
  assert.deepEqual(items.map((i) => i.level), [2, 3]);
});

test("缩进代码（≥4 空格）里的井号不算标题，懒延续同样不算", () => {
  const items = extractToc("正文段落\n\n    # 缩进代码里的井号\n    ## 也不算\n\n## 真标题", "t");
  assert.equal(items.length, 1);
  assert.equal(items[0].text, "真标题");
  const lazy = extractToc("段落\n    # 懒延续也不算\n\n## 甲", "t");
  assert.equal(lazy.length, 1);
  assert.equal(lazy[0].text, "甲");
});

test("ATX 收尾井号剥离、空标题保留占位、井号后无空格不是标题", () => {
  const items = extractToc("## 标题 ##\n\n###\n\n#不是标题\n\n##  留白  ", "t");
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.text), ["标题", "", "留白"]);
  assert.deepEqual(items.map((i) => i.level), [2, 3, 2]);
});

test("行内格式剥离对齐 textContent：强调/代码/链接留文本，图片整段删，实体解码", () => {
  const items = extractToc(
    "## **粗** `码` [链](https://x.dev) ![图](https://y.dev/i.png) &amp; &lt;角&gt;",
    "t",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].text, "粗 码 链 & <角>");
});

test("setext 标题：=== 一级、--- 二级；空行后的 --- 是分隔线不收录", () => {
  const items = extractToc("一级标题\n===\n\n二级标题\n---\n\n正文\n\n---\n\n## 甲", "t");
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.text), ["一级标题", "二级标题", "甲"]);
  assert.deepEqual(items.map((i) => i.level), [1, 2, 2]);
});

test("CRLF 与孤立 CR 行尾都兼容：三种换行混排计数不乱", () => {
  const items = extractToc("# 甲\r\n\r\n## 乙\r### 丙", "t");
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.text), ["甲", "乙", "丙"]);
  assert.deepEqual(items.map((i) => i.level), [1, 2, 3]);
});

test("块引用与列表标记剥离：内部标题照常计数（渲染器同样渲染它们）", () => {
  const items = extractToc(
    "> ## 引用里的标题\n\n- ## 列表里的标题\n\n1. ## 有序列表\n\n> 普通引用行\n- 普通列表项",
    "t",
  );
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.text), ["引用里的标题", "列表里的标题", "有序列表"]);
  assert.deepEqual(items.map((i) => i.level), [2, 2, 2]);
});

test("空输入与无标题正文返回空数组：页面据此整体不画目录", () => {
  assert.deepEqual(extractToc("", "t"), []);
  assert.deepEqual(extractToc("只有正文，没有标题。\n\n第二段", "t"), []);
});

test("多行段落接 setext 下划线：文本按空格合并成一条二级标题", () => {
  const items = extractToc("第一行\n第二行\n---", "t");
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { id: "t-0", text: "第一行 第二行", level: 2 });
});

test("前缀各自独立从 0 起：BEFORE/AFTER 两段互不串号", () => {
  const before = extractToc("## 甲\n## 乙", "before");
  const after = extractToc("## 丙", "after");
  assert.equal(before.length, 2);
  assert.equal(after.length, 1);
  assert.deepEqual(before.map((i) => i.id), ["before-0", "before-1"]);
  assert.deepEqual(after.map((i) => i.id), ["after-0"]);
});