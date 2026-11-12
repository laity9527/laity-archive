/**
 * 文件：tests/rss.test.ts
 * 描述：RSS 2.0 纯函数回归测试：XML 转义、Markdown 尽力剥离、feed 组装
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F27 RSS 订阅 Commit 1，TDD 先红后绿：14 条用例按方案 6.1）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRssXml, escapeXml, toPlainText } from "../src/lib/rss.ts";

const FIXED_DATE = new Date("2026-11-12T08:00:00Z");

// RFC 822 形状：周几, DD 月 YYYY HH:MM:SS GMT（toUTCString 的产物格式）
const RFC822 = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

test("escapeXml 五字符逐个转义", () => {
  assert.equal(escapeXml("&<>\"'"), "&amp;&lt;&gt;&quot;&apos;");
});

test("escapeXml 剥 XML 1.0 非法控制字符，保留换行与制表符", () => {
  // U+0000 与 U+0008 非法被剥；制表符、换行、回车是 XML 1.0 合法字符，必须保留。
  // 用 fromCharCode 构造输入，避免源码里出现真实控制字符
  const input =
    "a" + String.fromCharCode(0) + "b" + String.fromCharCode(9) + "c" +
    String.fromCharCode(10) + "d" + String.fromCharCode(8) + "e";
  const expected =
    "ab" + String.fromCharCode(9) + "c" + String.fromCharCode(10) + "de";

  assert.equal(escapeXml(input), expected);
});

test("escapeXml 正常文本原样不变", () => {
  assert.equal(escapeXml("hello 世界 2026"), "hello 世界 2026");
});

test("toPlainText 剥标题标记", () => {
  assert.equal(toPlainText("# 一级\n## 二级"), "一级 二级");
});

test("toPlainText 链接保留文字、图片保留 alt、URL 一律剥掉", () => {
  const out = toPlainText("[文](http://b.com/x) ![图](http://a.com/y.png)");

  assert.equal(out, "文 图");
  assert.ok(!out.includes("http://"));
});

test("toPlainText 围栏代码保留正文、行内代码保留内容", () => {
  const out = toPlainText("```js\nconst a = 1;\n``` 和 `x`");

  assert.equal(out, "const a = 1; 和 x");
});

test("toPlainText 剥加粗与强调标记", () => {
  assert.equal(toPlainText("**粗** 与 *斜*"), "粗 与 斜");
});

test("toPlainText 剥引用与列表标记", () => {
  assert.equal(toPlainText("> 引文\n- 无序\n1. 有序"), "引文 无序 有序");
});

test("toPlainText 剥原始 HTML 标签", () => {
  assert.equal(toPlainText("<div class='x'>hi</div>"), "hi");
});

test("toPlainText 连续空白压缩为单空格并去首尾", () => {
  assert.equal(toPlainText("  a\nb\n\nc  "), "a b c");
});

test("toPlainText 超 200 字符截断补省略号，短文本不动", () => {
  const long = toPlainText("词 ".repeat(120)); // 剥后 239 字符，应截断

  assert.equal(long.length, 201); // 截 200 + 省略号
  assert.ok(long.endsWith("…"));
  assert.equal(toPlainText("短文本"), "短文本");
});

test("buildRssXml 声明、命名空间与 channel 字段齐全", () => {
  const xml = buildRssXml(
    {
      title: "站点",
      link: "https://example.com",
      description: "描述",
      language: "zh-cn",
      lastBuildDate: FIXED_DATE,
    },
    [],
  );

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'));
  assert.ok(xml.includes("<title>站点</title>"));
  assert.ok(xml.includes("<link>https://example.com</link>"));
  assert.ok(xml.includes("<description>描述</description>"));
  assert.ok(xml.includes("<language>zh-cn</language>"));
  assert.ok(xml.includes("<lastBuildDate>" + FIXED_DATE.toUTCString() + "</lastBuildDate>"));
  assert.ok(xml.includes('<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml" />'));
});

test("buildRssXml item 字段、guid 与多 category", () => {
  const xml = buildRssXml(
    {
      title: "站点",
      link: "https://example.com",
      description: "描述",
      language: "zh-cn",
      lastBuildDate: null,
    },
    [
      {
        title: "标题一",
        link: "https://example.com/u/zhanglei/logs/a",
        pubDate: FIXED_DATE,
        description: "摘要",
        categories: ["架构", "Next.js"],
      },
    ],
  );

  assert.ok(xml.includes("<title>标题一</title>"));
  assert.ok(xml.includes("<link>https://example.com/u/zhanglei/logs/a</link>"));
  assert.ok(xml.includes("<guid isPermaLink=\"true\">https://example.com/u/zhanglei/logs/a</guid>"));
  assert.match(xml, new RegExp("<pubDate>" + FIXED_DATE.toUTCString() + "</pubDate>"));
  assert.match(FIXED_DATE.toUTCString(), RFC822);
  assert.ok(xml.includes("<category>架构</category>"));
  assert.ok(xml.includes("<category>Next.js</category>"));
});

test("buildRssXml 转义集成：注入字符全部落转义；空 feed 与 null 日期正确省略", () => {
  const xml = buildRssXml(
    {
      title: "站点",
      link: "https://example.com",
      description: "描述",
      language: "zh-cn",
      lastBuildDate: null,
    },
    [
      {
        title: '<b>&"x\'</b>',
        link: "https://example.com/u/h/logs/s",
        pubDate: FIXED_DATE,
        description: "<script>",
        categories: ["a<b", 'c"d'],
      },
    ],
  );

  assert.ok(xml.includes("&lt;b&gt;&amp;&quot;x&apos;&lt;/b&gt;"));
  assert.ok(xml.includes("&lt;script&gt;"));
  assert.ok(xml.includes("<category>a&lt;b</category>"));
  assert.ok(xml.includes("<category>c&quot;d</category>"));
  assert.ok(!xml.includes("<b>"));
  assert.ok(!xml.includes("<script>"));

  const empty = buildRssXml(
    { title: "站点", link: "https://example.com", description: "描述", language: "zh-cn", lastBuildDate: null },
    [],
  );

  assert.ok(!empty.includes("<item>"));
  assert.ok(!empty.includes("<lastBuildDate>"));
});
