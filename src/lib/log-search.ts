/**
 * 文件：src/lib/log-search.ts
 * 描述：日志搜索匹配纯函数：title/beforeContent/afterContent/tags 四字段大小写不敏感子串匹配
 * 作者：张磊
 * 创建日期：2026-11-11
 * 修改记录：
 * - 2026-11-11: 初始创建（V2.1 全局搜索；纯函数化便于单测，未来换 SQL 全文检索实现时页面无感；
 *               tags 用子串——Prisma 数组过滤只做元素级精确匹配，做不到子串，故搜索在内存层完成）
 */

export type SearchableLog = {
  title: string;
  beforeContent: string;
  afterContent?: string | null;
  tags: string[];
};

export function matchLog(log: SearchableLog, q: string): boolean {
  const needle = q.trim().toLowerCase();

  if (!needle) return true;

  return [log.title, log.beforeContent, log.afterContent ?? "", ...log.tags]
    .join("\n")
    .toLowerCase()
    .includes(needle);
}
