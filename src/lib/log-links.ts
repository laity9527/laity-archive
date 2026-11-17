/**
 * 文件：src/lib/log-links.ts
 * 描述：正文内链 `[[slug]]` 的解析与 hast 改写；纯函数，渲染器与单测共用同一套规则
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G1 第一刀）。作用域限定"同一作者已发布日志"：
 *               链接目标来自详情页本来就要查的上下文查询（不新增 Prisma 调用），
 *               未命中（草稿 / 别家 / 写错 slug）一律保留原文，不猜、不泄露存在性。
 *               代码块与既有链接内部不接管，避免把示例文本或嵌套 a 改成内链。
 * - 2026-11-16: "被引用"反向列表未在本轮落地：它需要对全租户正文做 contains 查询，
 *               会让详情页 Prisma 调用 2→3。虽然仍在 AGENTS 的"任一前台页 ≤3"内，
 *               但与 B0 验收写下的"详情页 ≤2"冲突，故留待单独裁定，不在本轮偷偷抬高基线。
 */

export type LogLinkPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; slug: string };

// slug 口径与表单一致：小写字母 / 数字，段间单个连字符；不许下划线、空格与中文
const LOG_LINK_SOURCE = "\\[\\[([a-z0-9]+(?:-[a-z0-9]+)*)\\]\\]";
export const MAX_LOG_LINKS = 50;

function logLinkRegExp() {
  return new RegExp(LOG_LINK_SOURCE, "g");
}

/**
 * 把一段文本切成"普通文本 / 内链占位"两类片段。
 * 是否真的渲染成链接由调用方按解析结果决定（见 rehypeLogLinks）；本函数不碰 DOM。
 */
export function splitLogLinkText(value: string): LogLinkPart[] {
  const parts: LogLinkPart[] = [];
  let last = 0;

  for (const match of value.matchAll(logLinkRegExp())) {
    const index = match.index ?? 0;

    if (index > last) {
      parts.push({ type: "text", value: value.slice(last, index) });
    }

    parts.push({ type: "link", value: match[0], slug: match[1] });
    last = index + match[0].length;
  }

  if (last < value.length) {
    parts.push({ type: "text", value: value.slice(last) });
  }

  return parts;
}

/**
 * 抽出正文里引用到的 slug：保持出现顺序、去重、封顶 MAX_LOG_LINKS。
 * 入参允许 null（afterContent / lessonLearned 可空），空值直接跳过。
 */
export function extractLogLinkSlugs(
  ...sources: (string | null | undefined)[]
): string[] {
  const seen = new Set<string>();

  for (const source of sources) {
    if (!source) continue;

    for (const match of source.matchAll(logLinkRegExp())) {
      if (seen.size >= MAX_LOG_LINKS) return [...seen];
      seen.add(match[1]);
    }
  }

  return [...seen];
}

// hast 的最小形状：与 markdown.tsx 保持同一份字段假设
export type LogLinkHastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: LogLinkHastNode[];
  value?: string;
};

// 这些元素内部一律不接管：代码块是"原文示例"，链接里再套链接会破坏阅读与语义
const LITERAL_TAGS = new Set(["code", "pre", "a", "script", "style"]);

export type LogLinkResolver = {
  // slug → 目标标题；只放已发布、可公开访问的日志，未命中即不渲染链接
  links: Record<string, string>;
  href: (slug: string) => string;
};

/**
 * rehype 插件：把文本里的 `[[slug]]` 换成指向目标日志的 <a>，显示目标标题（不是 slug）。
 * 未命中的占位保留 `[[slug]]` 原文——作者能看出引用没生效，读者也不会看到死链。
 */
export function rehypeLogLinks({ links, href }: LogLinkResolver) {
  return (tree: LogLinkHastNode) => {
    rewrite(tree, false);
  };

  function rewrite(node: LogLinkHastNode, literal: boolean) {
    if (!node.children) return;

    const insideLiteral =
      literal ||
      (node.type === "element" &&
        node.tagName !== undefined &&
        LITERAL_TAGS.has(node.tagName));
    const next: LogLinkHastNode[] = [];

    // 相邻文本合并：未命中的占位回到原文时不能多出一段空文本，
    // 否则产物里会变成“见 ”+“[[slug]]”两个节点（渲染一样，但 HTML 与测试都难看）
    const pushText = (value: string) => {
      const last = next.at(-1);

      if (last?.type === "text") {
        last.value = `${last.value ?? ""}${value}`;
        return;
      }

      next.push({ type: "text", value });
    };

    for (const child of node.children) {
      if (
        child.type === "text" &&
        !insideLiteral &&
        typeof child.value === "string" &&
        child.value.includes("[[")
      ) {
        for (const part of splitLogLinkText(child.value)) {
          if (part.type === "text") {
            pushText(part.value);
            continue;
          }

          const title = links[part.slug];

          if (!title) {
            pushText(part.value);
            continue;
          }

          next.push({
            type: "element",
            tagName: "a",
            properties: { href: href(part.slug) },
            children: [{ type: "text", value: title }],
          });
        }

        continue;
      }

      rewrite(child, insideLiteral);
      next.push(child);
    }

    node.children = next;
  }
}
