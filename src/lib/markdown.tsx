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
 * - 2026-11-16: 重构 B0：代码块交给 CodeBlock（语言标签 + 复制），图片加 loading="lazy"/decoding="async"；
 *               语言与正文都从 hast 节点读，不额外引插件，rehype-sanitize 仍是唯一边界
 * - 2026-11-16: 评审 G1：可选 logLinks，把正文 `[[slug]]` 改成指向同作者已发布日志的内链；
 *               只在传入解析表时启用（编辑预览不传即原样显示），改写发生在 sanitize 之前，清洗仍是唯一边界
 */
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { PluggableList } from "unified";
import { CodeBlock } from "@/components/trace/CodeBlock";
import { rehypeLogLinks, type LogLinkResolver } from "@/lib/log-links";

type MarkdownProps = {
  source: string;
  // 锚点 id 前缀（F23）：详情页传 "before"/"after"，Editor 预览不传即不盖 id
  tocIdPrefix?: string;
  // 正文内链解析表（G1）：详情页传入同作者已发布日志的 slug → 标题；不传即禁用
  logLinks?: LogLinkResolver;
};

// hast 的最小形状：只用到 element / text 两种节点与 className
type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/**
 * 从 <pre><code class="language-x">…</code></pre> 里读出语言与纯文本。
 * 读不到就返回 null，调用方回落默认 <pre>（例如正文里手写的裸 pre）。
 */
function readCodeBlock(node: unknown): { lang: string; code: string } | null {
  const root = node as HastNode | undefined;
  const codeNode = root?.children?.find(
    (child) => child.type === "element" && child.tagName === "code",
  );

  if (!codeNode) return null;

  const raw = codeNode.properties?.className;
  const classes = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === "string"
      ? [raw]
      : [];
  const lang =
    classes
      .find((item) => item.startsWith("language-"))
      ?.slice("language-".length) ?? "";
  const code = (codeNode.children ?? [])
    .map((child) => (child.type === "text" ? child.value ?? "" : ""))
    .join("")
    .replace(/\n$/, "");

  return { lang, code };
}

const pre: Components["pre"] = ({ node, children }) => {
  const parsed = readCodeBlock(node);

  if (!parsed) {
    return <pre>{children}</pre>;
  }

  return <CodeBlock lang={parsed.lang} code={parsed.code} />;
};

// 正文图片一律懒加载；点击放大由 ZoomableArticle 用事件委托接管。
// node 是 hast 节点，不能落到 DOM 上（刻意丢弃）；alt 显式声明，缺省空串（装饰性）
const img: Components["img"] = ({ node, alt, ...props }) => {
  void node;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt ?? ""} loading="lazy" decoding="async" />
  );
};

// 只降级标签：正文的层级关系由作者的 # 数量决定，页级 h1 归页面自己。
// 清洗后的 h1 不带任何属性，所以这里只搬 children，不 spread 整个 props
// （props 里混着 hast 的 node 对象，直接铺到 DOM 元素上会招来一条 React 警告）
const COMPONENTS: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  pre,
  img,
};

export function Markdown({ source, tocIdPrefix, logLinks }: MarkdownProps) {
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
          pre,
          img,
        };

  return (
    <div className="log-body text-ink">
      <ReactMarkdown
        components={components}
        rehypePlugins={
          (logLinks
            ? [[rehypeLogLinks, logLinks], rehypeSanitize]
            : [rehypeSanitize]) as PluggableList
        }
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
