/**
 * 文件：src/lib/markdown.tsx
 * 描述：Markdown 唯一渲染出口：react-markdown + rehype-sanitize，页面禁止自行拼装渲染器
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，清洗强制走 rehype-sanitize 默认 schema
 * - 2026-11-04: 正文里的 h1 降级渲染成 h2（D27）：默认 schema 放行 h1，而日志正文习惯用 `#` 起头，
 *               于是详情页在页级标题之外再多出第二个 h1——读屏的标题树和搜索引擎都只认一个
 * - 2026-11-11: F23/D34 加可选 tocIdPrefix：传入时 h1/h2/h3 按渲染序盖 `${prefix}-${n}` 锚点 id，
 *               与 src/lib/toc.ts 的 extractToc 同一计数口径；不传即原行为（Editor 预览零影响），h1→h2 降级保留
 */
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type MarkdownProps = {
  source: string;
  // 锚点 id 前缀（F23）：详情页传 "before"/"after"，Editor 预览不传即不盖 id
  tocIdPrefix?: string;
};

// 只降级标签：正文的层级关系由作者的 # 数量决定，页级 h1 归页面自己。
// 清洗后的 h1 不带任何属性，所以这里只搬 children，不 spread 整个 props
// （props 里混着 hast 的 node 对象，直接铺到 DOM 元素上会招来一条 React 警告）
const COMPONENTS: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
};

export function Markdown({ source, tocIdPrefix }: MarkdownProps) {
  // 计数器是每次渲染独立的闭包：StrictMode 双渲染各自从 0 起，序号不会串；
  // react-markdown 按文档序同步渲染标题，与 extractToc 的抽取序一一对应（错位由 ArticleToc 客户端自证兜底）
  let headingIndex = 0;
  const components: Components =
    tocIdPrefix === undefined
      ? COMPONENTS
      : {
          h1: ({ children }) => (
            <h2 id={`${tocIdPrefix}-${headingIndex++}`}>{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 id={`${tocIdPrefix}-${headingIndex++}`}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={`${tocIdPrefix}-${headingIndex++}`}>{children}</h3>
          ),
        };

  return (
    <div className="log-body text-ink">
      <ReactMarkdown components={components} rehypePlugins={[rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}