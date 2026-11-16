/**
 * 文件：src/lib/featured.ts
 * 描述：首页 / 租户页「精选项目」口径的纯函数：日志数优先，同数再按最近更新
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 从 src/lib/projects.ts 抽出（原函数与 Prisma 同模块，node --test 无法导入）。
 *               口径不变：只取有已发布日志的项目、日志数降序、同数按 latest 降序、最多 take 个。
 *               抽出的目的是让这条"首页第一屏怎么选"的规则可以被单元测试钉住
 */

export type FeaturedCandidate = {
  count: number;
  latest: Date | null;
};

/**
 * 只挑有内容的项目：零日志项目不进精选（它们只出现在状态看板里）。
 * 只看"最近更新"会让只有 1 条日志的工具排到主项目之前，所以先比日志数、再比最近更新。
 */
export function pickFeatured<T extends FeaturedCandidate>(
  board: readonly T[],
  take = 3,
): T[] {
  return [...board]
    .filter((item) => item.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (b.latest?.getTime() ?? 0) - (a.latest?.getTime() ?? 0),
    )
    .slice(0, Math.max(take, 0));
}
