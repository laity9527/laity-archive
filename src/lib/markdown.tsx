/**
 * 文件：src/lib/markdown.tsx
 * 描述：Markdown 唯一渲染出口：react-markdown + rehype-sanitize，页面禁止自行拼装渲染器
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，清洗强制走 rehype-sanitize 默认 schema
 */
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type MarkdownProps = {
  source: string;
};

export function Markdown({ source }: MarkdownProps) {
  return (
    <div className="log-body text-ink">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{source}</ReactMarkdown>
    </div>
  );
}
