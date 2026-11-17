/**
 * 文件：src/lib/publish-trend.ts
 * 描述：后台概览「近 12 周发布」的纯函数：UTC 周切桶（周一为周首），不做时区换算
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G12）。原先概览只有四个计数卡，看不出"什么时候在写"；
 *               把发布时间按周切桶后页面用纯 CSS 画柱子，不引图表库。
 *               周首固定周一、按 UTC 切——全库存时与归档分组都用 UTC，这里不另立第二套口径。
 */

export const TREND_WEEKS = 12;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 当前周的周一 00:00（UTC）。周日记 day=0，映射到"距本周一 6 天前"。 */
function utcWeekStart(now: Date): Date {
  const day = now.getUTCDay();
  const offset = (day + 6) % 7;

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset),
  );
}

/** 最近 weeks 个周的起点，按时间升序（最后一个就是本周）。 */
export function trendWeekStarts(now: Date, weeks = TREND_WEEKS): Date[] {
  const count = Math.max(1, Math.floor(weeks));
  const current = utcWeekStart(now);

  return Array.from(
    { length: count },
    (_, index) => new Date(current.getTime() - (count - 1 - index) * WEEK_MS),
  );
}

/**
 * 把发布时间切成每周计数，升序返回（最后一项是本周）。
 * 窗口外的日期（更早、或落在本周之后）一律忽略，不塞进第一桶/最后一桶。
 */
export function bucketWeeklyPublishes(
  dates: readonly Date[],
  now: Date,
  weeks = TREND_WEEKS,
): number[] {
  const starts = trendWeekStarts(now, weeks);
  const windowStart = starts[0].getTime();
  const windowEnd = starts.at(-1)!.getTime() + WEEK_MS;
  const counts = new Array(starts.length).fill(0) as number[];

  for (const date of dates) {
    const time = date.getTime();

    if (!Number.isFinite(time) || time < windowStart || time >= windowEnd) {
      continue;
    }

    const index = Math.floor((time - windowStart) / WEEK_MS);

    if (index >= 0 && index < counts.length) {
      counts[index] += 1;
    }
  }

  return counts;
}
