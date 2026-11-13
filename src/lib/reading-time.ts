/**
 * 文件：src/lib/reading-time.ts
 * 描述：阅读时长估算（纯函数）：剥离 Markdown 标记后按 400 字/分钟折算，最少 1 分钟
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。B2 详情页头部展示「约 N 分钟读完」；中文按字计、英文按词折算，
 *               代码块与链接目标不计入——它们不是连续阅读的正文
 */

// Markdown 的结构字符不是阅读内容：代码块整段跳过，链接只留锚文本，图片不计数
function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, " ")
    .replace(/^[ \t]*>[ \t]?/gm, " ")
    .replace(/[*_~]/g, " ");
}

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD_PATTERN = /[A-Za-z0-9]+/g;

/**
 * 400 字/分钟是中文长文的保守速度；英文按 2 个字符折算 1 个中文单位，
 * 避免中英混排的文章被低估。空正文返回 0，调用方据此决定要不要显示。
 */
export function estimateReadingMinutes(markdown: string): number {
  if (!markdown.trim()) {
    return 0;
  }

  const plain = stripMarkdown(markdown);
  const cjk = plain.match(CJK_PATTERN)?.length ?? 0;
  const words = plain.match(LATIN_WORD_PATTERN)?.length ?? 0;
  const units = cjk + words * 2;

  if (units === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(units / 400));
}
