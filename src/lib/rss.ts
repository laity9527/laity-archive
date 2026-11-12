/**
 * 文件：src/lib/rss.ts
 * 描述：RSS 2.0 纯函数层：XML 转义、Markdown 尽力剥离、feed 组装（F27）
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F27 RSS 订阅 Commit 1：三个纯函数按方案 3.4 接口约定，TDD 先红后绿）
 */

// 五字符转义 + 剥 XML 1.0 非法控制字符（制表、换行、回车是合法字符，保留）
export function escapeXml(text: string) {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 尽力而为的 Markdown 剥离，**不是完整解析器**：只覆盖档案正文里常见的语法形态
// （标题/围栏与行内代码/链接图片/强调/引用与列表标记/原始 HTML 标签），然后压缩空白。
// 局限：嵌套结构、混排行内语法、未闭合围栏、词内下划线等边角情形只按最简规则处理，
// 输出仅作 feed 预览用，不承担渲染或保真比对。maxChars 为预览截断口径（方案 3.3，默认 200）。
export function toPlainText(markdown: string, maxChars = 200) {
  let text = markdown;

  // 先剥围栏（保留内部正文），再剥行内代码，避免 ``` 序列被行内规则拆坏
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, "$1");
  text = text.replace(/```[^\n]*/g, "");
  text = text.replace(/`([^`\n]*)`/g, "$1");
  // 图片在链接前剥（图片语法包含链接语法），各自保留文字与 alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 加粗在强调前剥，避免被单星号规则拆断
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  text = text.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  text = text.replace(/^[ \t]{0,3}[-*+][ \t]+/gm, "");
  text = text.replace(/^[ \t]{0,3}\d+\.[ \t]+/gm, "");
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > maxChars) {
    return `${text.slice(0, maxChars)}…`;
  }

  return text;
}

export type RssChannel = {
  title: string;
  link: string;
  description: string;
  language: string;
  // null 表示省略该元素（空 feed 无确定构建时刻，不引入非确定性）
  lastBuildDate: Date | null;
};

export type RssItem = {
  title: string;
  link: string;
  pubDate: Date;
  description: string;
  categories: string[];
};

// 组装 RSS 2.0 文档：纯数据进、XML 字符串出，全确定性、可单测。
// atom:link 的自指地址按"站点链接 + /feed.xml"拼，与路由路径单点对应。
export function buildRssXml(channel: RssChannel, items: RssItem[]) {
  const itemRows = items.map((item) => {
    const categories = item.categories
      .map((tag) => `      <category>${escapeXml(tag)}</category>`)
      .join("\n");

    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
      `      <pubDate>${item.pubDate.toUTCString()}</pubDate>`,
      categories,
      `      <description>${escapeXml(item.description)}</description>`,
      "    </item>",
    ]
      .filter((row) => row !== "")
      .join("\n");
  });

  const rows = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    channel.lastBuildDate
      ? `    <lastBuildDate>${channel.lastBuildDate.toUTCString()}</lastBuildDate>`
      : "",
    `    <atom:link href="${escapeXml(channel.link)}/feed.xml" rel="self" type="application/rss+xml" />`,
    ...itemRows,
    "  </channel>",
    "</rss>",
  ]
    .filter((row) => row !== "")
    .join("\n");

  return rows;
}
