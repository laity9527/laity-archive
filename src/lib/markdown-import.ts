/**
 * 文件：src/lib/markdown-import.ts
 * 描述：Markdown 导入的元信息推导：从文件名推 slug、从首个 `# ` 标题推标题，正文去掉该标题
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G10）。导入只做三件事：把文件名变成合法 slug、把首个 H1 当标题、
 *               其余正文原样保留；不解析 front-matter、不猜标签——猜错比让作者填更贵。
 *               中文文件名推不出 slug 时返回空串，由作者补填，不生成乱码 slug。
 */

export type ImportMeta = {
  title: string;
  slug: string;
  body: string;
};

const MAX_SLUG = 80;

/** 文件名 → 合法 slug：小写、非字母数字折叠成单个连字符、去首尾连字符；推不出就返回空串 */
export function slugFromFileName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
}

/**
 * 从 Markdown 原文抽标题与正文。标题只认文首第一个非空行且必须是 `# ` 开头；
 * 找到就把这一行从正文里去掉（否则标题会在页面 H1 之外再出现一次）。
 */
export function deriveImportMeta(fileName: string, raw: string): ImportMeta {
  const text = raw.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  let index = 0;

  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  const first = lines[index] ?? "";
  const heading = /^#\s+(.+)$/.exec(first);
  const title = heading ? heading[1].trim() : "";
  const body = (heading ? lines.slice(index + 1) : lines)
    .join("\n")
    .replace(/^\n+/, "");

  return { title, slug: slugFromFileName(fileName), body };
}
