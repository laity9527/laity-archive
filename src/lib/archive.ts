/**
 * 文件：src/lib/archive.ts
 * 描述：归档分组纯函数：把已发布日志按「年 → 月」分组并排序，供 /archive 页面使用
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。原先分组写在 getArchive() 里、与查询耦合，无法单测；
 *               抽成纯函数后分组规则（年降序 → 月降序 → 日内保持传入顺序）可用 node --test 钉死。
 *               时间一律按 UTC 切片，与全库存时口径一致，不在展示层做时区换算
 */

export type ArchiveEntry = {
  id: string;
  title: string;
  slug: string;
  handle: string;
  projectName: string;
  beforeDate: Date;
};

export type ArchiveMonth = { key: string; items: ArchiveEntry[] };

export type ArchiveYear = { year: string; count: number; months: ArchiveMonth[] };

/**
 * 入参约定：已按 `beforeDate` 倒序（与大厅一致）；本函数只做分组与年/月排序，
 * 组内保持传入顺序——这样"同一天的先后"由查询层的 `beforeDate desc, id desc` 决定，
 * 分组层不再引入第二套排序口径。
 */
export function groupArchive(rows: readonly ArchiveEntry[]): ArchiveYear[] {
  const years = new Map<string, Map<string, ArchiveEntry[]>>();

  for (const row of rows) {
    // UTC 切片：`2026-11-06T05:42:05.491Z` → 年 `2026`、月 `2026-11`
    const iso = row.beforeDate.toISOString();
    const year = iso.slice(0, 4);
    const month = iso.slice(0, 7);

    const months = years.get(year) ?? new Map<string, ArchiveEntry[]>();
    const items = months.get(month) ?? [];

    items.push(row);
    months.set(month, items);
    years.set(year, months);
  }

  return [...years.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, months]) => ({
      year,
      count: [...months.values()].reduce((sum, items) => sum + items.length, 0),
      months: [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, items]) => ({ key, items })),
    }));
}
