/**
 * 文件：src/lib/stats-admin.ts
 * 描述：统计底座（V5 Phase 3）：只读聚合查询 + 内存访问计数入口——零业务写入，
 *       全部为 count/groupBy 读口径；聚合形状与计数器纯函数在 stats-core.ts（单测钉住）
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（Phase 3 任务 2）。线索总量/待处理新增/近 7 天/状态分布、
 *               媒体总量（未软删）/软删数/证据媒体数、服务与 FAQ 访问计数快照；
 *               访问计数由 /services 与 /faq 页面渲染时自增（内存，重启清零）
 * - 2026-11-19: V5 Phase 4 任务 1：补三个派生指标（全部只读聚合）——近 7 天发布数、
 *               待锚定版本行总数（gitSha 为 null，负责人确认口径 A）、反转率
 *               （OVERTURNED/(VERIFIED+OVERTURNED)，分母 0 → null 显示 —）；口径纯函数在 stats-core
 */
import { db } from "@/lib/db";
import {
  computeStats,
  faqVisits,
  overturnRate,
  sevenDaysAgo,
  serviceVisits,
  type StatsOverview,
} from "@/lib/stats-core";

/** 只读聚合：十条 count/groupBy 并行取数，组装交给 stats-core 的纯函数 */
export async function loadStats(): Promise<StatsOverview> {
  const since = sevenDaysAgo(new Date());
  const [leadTotal, leadNew, leadLast7Days, statusGroups, mediaTotal, mediaDeleted, evidenceMedia, publishedLast7Days, pendingAnchorVersions, verdictGroups] =
    await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { status: "NEW" } }),
      db.lead.count({ where: { createdAt: { gte: since } } }),
      db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      db.media.count({ where: { deletedAt: null } }),
      db.media.count({ where: { deletedAt: { not: null } } }),
      db.media.count({ where: { isEvidence: true, deletedAt: null } }),
      // V5 Phase 4：三个派生指标（全部只读）——近 7 天发布数 / 待锚定版本行 / 裁决分布（反转率现算）
      db.trace.count({ where: { isPublished: true, publishedAt: { gte: since } } }),
      db.traceRevision.count({ where: { gitSha: null } }),
      db.trace.groupBy({ by: ["verdict"], where: { isPublished: true }, _count: { _all: true } }),
    ]);

  const leadByStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    leadByStatus[group.status] = group._count._all;
  }

  const verdictCount = (verdict: string) =>
    verdictGroups.find((group) => group.verdict === verdict)?._count._all ?? 0;
  const rate = overturnRate(verdictCount("VERIFIED"), verdictCount("OVERTURNED"));

  const stats = computeStats({
    leadTotal,
    leadNew,
    leadLast7Days,
    leadByStatus,
    mediaTotal,
    mediaDeleted,
    evidenceMedia,
    serviceVisits: serviceVisits.snapshot(),
    faqVisits: faqVisits.snapshot(),
    publishedLast7Days,
    pendingAnchorVersions,
    overturnRate: rate,
  });

  // 纯函数用固定零值时间保持确定性可测；真实生成时间由本层覆盖
  return { ...stats, generatedAt: new Date().toISOString() };
}

/** 服务页渲染时自增（内存计数，不做持久化埋点） */
export function incrementServiceVisit(): void {
  serviceVisits.increment("services");
}

/** FAQ 页渲染时自增 */
export function incrementFaqVisit(): void {
  faqVisits.increment("faq");
}
