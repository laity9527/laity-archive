/**
 * 文件：src/lib/highlight.ts
 * 描述：搜索关键词高亮纯函数：把文本按大小写不敏感子串切成 {text, match} 段；提取首个命中处前后的片段窗口
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F24 搜索关键词高亮 Commit 1）。用 indexOf 循环而非正则——查询词是用户输入，
 *               拼进 RegExp 会引入正则注入与 ReDoS 两个面；lowercase 折叠只用于定位，切片取原文以保留
 *               作者写的大小写；段序列由调用方（RSC）渲染为 React 文本节点，全链路不用 dangerouslySetInnerHTML
 */

export type Segment = {
  text: string;
  match: boolean;
};

// 查询词与 matchLog 同口径：trim 后 toLowerCase 做子串匹配（两侧一致，不会出现"匹配了但没高亮"）
function needleOf(query: string) {
  return query.trim().toLowerCase();
}

// 把 text 切成交替段：命中段 match=true。空查询返回单段不命中；无命中同理。
// 不变量：段序列拼接等于原文（调用方据此渲染，不增删字符）。
export function highlightSegments(text: string, query: string): Segment[] {
  const needle = needleOf(query);

  if (!needle || !text) {
    return text ? [{ text, match: false }] : [];
  }

  const haystack = text.toLowerCase();
  const segments: Segment[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle, cursor);

  while (index !== -1) {
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), match: false });
    }

    segments.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return segments;
}

// 取首个命中处前后 radius 字符的窗口；无命中返回 null。
// 窗口边界不变量：切片后按完整 needle 做 indexOf，恰好被切口截断的命中（needle 跨越边界）
// 不可能匹配——截断串不等于完整 needle，天然不会产生半个词的高亮残段。
export function extractSnippet(
  text: string,
  query: string,
  radius = 60,
): { segments: Segment[]; leadingEllipsis: boolean; trailingEllipsis: boolean } | null {
  const needle = needleOf(query);

  if (!needle) {
    return null;
  }

  const index = text.toLowerCase().indexOf(needle);

  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);

  return {
    segments: highlightSegments(text.slice(start, end), query),
    leadingEllipsis: start > 0,
    trailingEllipsis: end < text.length,
  };
}
