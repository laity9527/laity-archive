/**
 * 文件：src/lib/markdown.tsx
 * 描述：Markdown 唯一渲染出口：react-markdown + rehype-sanitize，页面禁止自行拼装渲染器
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，清洗强制走 rehype-sanitize 默认 schema
 * - 2026-11-04: 正文里的 h1 降级渲染成 h2（D27）：默认 schema 放行 h1，而日志正文习惯用 `#` 起头，
 *               于是详情页在页级标题之外再多出第二个 h1——读屏的标题树和搜索引擎都只认一个
 */
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type MarkdownProps = {
  source: string;
};

// 只降级标签，类名与内容不动：正文的层级关系由作者的 # 数量决定，页级 h1 归页面自己
const COMPONENTS: Components = {
  h1: ({ node, ...props }) => <h2 {...props} />,
};

export function Markdown({ source }: MarkdownProps) {
  return (
    <div className="log-body text-ink">
      <ReactMarkdown components={COMPONENTS} rehypePlugins={[rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
