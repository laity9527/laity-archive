/**
 * 文件：src/lib/related.ts
 * 描述：日志详情的相邻与相关挑选（纯函数）：当前页在时间序列中的前后篇，以及同标签优先、同项目兜底的相关阅读
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。实测 56 个标签里只有 1 个被复用过，单靠「同标签」取不到 3 条，
 *               因此相关阅读采用回退链：同标签（按共享标签数）→ 同项目最近发布；把挑选逻辑
 *               抽成纯函数以便在没有数据库的情况下单测
 */

export type RelatedRow = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  projectId: string;
  beforeDate: Date;
};

export type RelatedReason = "tag" | "project" | "mixed";

/**
 * 入参必须已按「时间倒序」排列（与大厅一致：beforeDate desc, id desc）。
 * older 是列表里的下一条（更早），newer 是上一条（更新）。
 */
export function pickNeighbors<T extends { id: string }>(
  rowsDesc: readonly T[],
  currentId: string,
): { older: T | null; newer: T | null } {
  const index = rowsDesc.findIndex((row) => row.id === currentId);

  if (index < 0) {
    return { older: null, newer: null };
  }

  return {
    older: rowsDesc[index + 1] ?? null,
    newer: rowsDesc[index - 1] ?? null,
  };
}

function sharedTagCount(row: RelatedRow, current: Pick<RelatedRow, "tags">) {
  const currentTags = new Set(current.tags);

  return row.tags.filter((tag) => currentTags.has(tag)).length;
}

/**
 * 相关阅读：先取共享标签最多的（同分按发布时间倒序），不足 limit 时用同项目最近发布补齐。
 * 同一个 id 不会出现两次；reason 用于页面标题，避免把「同项目」写成「同标签」。
 */
export function pickRelated<T extends RelatedRow>(
  rowsDesc: readonly T[],
  current: Pick<RelatedRow, "id" | "tags" | "projectId">,
  limit = 3,
  excludeIds: readonly string[] = [],
): { items: T[]; reason: RelatedReason | null } {
  const excluded = new Set([...excludeIds, current.id]);
  const others = rowsDesc.filter((row) => !excluded.has(row.id));

  const tagMatches = others
    .map((row) => ({ row, shared: sharedTagCount(row, current) }))
    .filter((item) => item.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.row.beforeDate.getTime() - a.row.beforeDate.getTime(),
    )
    .slice(0, limit)
    .map((item) => item.row);

  if (tagMatches.length >= limit) {
    return { items: tagMatches, reason: "tag" };
  }

  const picked = new Set(tagMatches.map((row) => row.id));
  const projectMatches = others
    .filter((row) => row.projectId === current.projectId && !picked.has(row.id))
    .sort((a, b) => b.beforeDate.getTime() - a.beforeDate.getTime())
    .slice(0, limit - tagMatches.length);

  const items = [...tagMatches, ...projectMatches];

  if (items.length === 0) {
    return { items, reason: null };
  }

  if (projectMatches.length === 0) {
    return { items, reason: "tag" };
  }

  if (tagMatches.length === 0) {
    return { items, reason: "project" };
  }

  return { items, reason: "mixed" };
}
