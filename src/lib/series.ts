/**
 * 文件：src/lib/series.ts
 * 描述：系列进度纯函数：在“同作者已发布日志”的行集里算出当前篇的序号与总数
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 / G2）。不建系列表：同名即同系列，排序按决策时间升序；
 *               同一天的两篇用 slug 作稳定次键，避免序号随查询顺序漂移。
 *               行集由详情页已有的 getLogContext 提供，本函数不发查询
 * - 2026-11-18: 新增 seriesSlug()：把展示名映射为稳定内部键，供 Series 实体使用；
 *               SHA-256 前 16 位，中文名也可用，避免以名称为唯一键。
 */
import { createHash } from "node:crypto";

export function seriesSlug(name: string): string {
  return `series-${createHash("sha256").update(name.trim()).digest("hex").slice(0, 16)}`;
}

export type SeriesRow = {
  slug: string;
  series: string | null;
  beforeDate: Date;
};

export type SeriesInfo = {
  name: string;
  position: number;
  total: number;
};

/**
 * 当前日志在系列里的位置。没有系列、或当前 slug 不在行集里，返回 null（页面不渲染这一行）。
 * rows 约定为同一作者的全部已发布日志（详情页本来就是这么取的，不额外查库）。
 */
export function seriesProgress(
  rows: readonly SeriesRow[],
  currentSlug: string,
): SeriesInfo | null {
  const current = rows.find((row) => row.slug === currentSlug);

  if (!current?.series) {
    return null;
  }

  const same = rows
    .filter((row) => row.series === current.series)
    .sort(
      (a, b) =>
        a.beforeDate.getTime() - b.beforeDate.getTime() ||
        a.slug.localeCompare(b.slug),
    );
  const index = same.findIndex((row) => row.slug === currentSlug);

  if (index < 0) {
    return null;
  }

  return { name: current.series, position: index + 1, total: same.length };
}
