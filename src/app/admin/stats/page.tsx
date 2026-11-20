/**
 * 文件：src/app/admin/stats/page.tsx
 * 描述：统计看板（Phase 4 升级）：线索/媒体/访问计数/派生指标四块；状态分布与媒体占比
 *       用内联 SVG 水平条形（纯自绘，零图表库零依赖）；数字来自 loadStats 只读聚合
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（Phase 3 任务 3）。loadStats 纯读口径，页面无任何写操作；
 *               无图表无看板布局，仅数字文本
 * - 2026-11-19: V5 Phase 4 任务 2：升级为看板——四块布局，状态分布与媒体占比用内联 SVG
 *               水平条形（fill 走既有颜色令牌，条宽按占最大值比例）；派生指标区
 *               （近 7 天发布/待锚定版本/反转率，null 显示 —）；鉴权与只读口径不变
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { loadStats } from "@/lib/stats-admin";

export const metadata: Metadata = {
  title: "统计",
  robots: { index: false, follow: false },
};

export const instant = false;

const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索",
  REPLIED: "已回复",
  ARCHIVED: "已关闭",
  SPAM: "垃圾",
};

const STATUS_ORDER = ["NEW", "REPLIED", "ARCHIVED", "SPAM"] as const;

/** 内联 SVG 水平条形（纯自绘）：条宽按 value/max 比例，轨道与条用既有颜色令牌 */
function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 font-sans text-xs text-ink-soft">{label}</span>
      <svg
        className="h-2.5 min-w-0 flex-1"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} ${value}`}
      >
        <rect width="100" height="10" className="fill-hairline" />
        {value > 0 && <rect width={percent} height="10" className="fill-ink-soft" />}
      </svg>
      <span className="w-12 shrink-0 text-right font-mono text-xs text-ink">{value}</span>
    </div>
  );
}

function dictText(dict: Record<string, number>): string {
  const keys = Object.keys(dict);
  if (keys.length === 0) return "0";
  return keys
    .map((key) => `${STATUS_LABELS[key] ?? key} ${dict[key]}`)
    .join(" · ");
}

export default async function AdminStatsPage() {
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fstats");

  const stats = await loadStats();
  const statusMax = Math.max(1, ...Object.values(stats.leads.byStatus));
  const mediaMax = Math.max(1, stats.media.total, stats.media.deleted, stats.media.evidence);
  const overturnText =
    stats.derived.overturnRate === null
      ? "—"
      : `${Math.round(stats.derived.overturnRate * 100)}%`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">
            统计看板 · 只读快照 · {stats.generatedAt.slice(0, 16).replace("T", " ")} UTC
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">统计</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      <section className="mt-8 border-y border-hairline py-6">
        <h2 className="font-sans text-sm text-ink">线索</h2>
        <p className="mt-2 font-mono text-sm text-ink">
          总量 {stats.leads.total} · 待处理 {stats.leads.new} · 近 7 天 {stats.leads.last7Days}
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {STATUS_ORDER.map((status) => (
            <StatBar
              key={status}
              label={STATUS_LABELS[status]}
              value={stats.leads.byStatus[status] ?? 0}
              max={statusMax}
            />
          ))}
        </div>
        <p className="mt-3 font-sans text-xs text-ink-soft">状态分布：{dictText(stats.leads.byStatus)}</p>
      </section>

      <section className="mt-8 border-b border-hairline pb-6">
        <h2 className="font-sans text-sm text-ink">媒体</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          <StatBar label="在库" value={stats.media.total} max={mediaMax} />
          <StatBar label="回收站" value={stats.media.deleted} max={mediaMax} />
          <StatBar label="证据" value={stats.media.evidence} max={mediaMax} />
        </div>
        <p className="mt-3 font-sans text-xs text-ink-soft">
          占比以三者的最大值为满条基准；证据媒体为 isEvidence 且未软删。
        </p>
      </section>

      <section className="mt-8 border-b border-hairline pb-6">
        <h2 className="font-sans text-sm text-ink">访问计数（内存，重启清零）</h2>
        <p className="mt-3 font-mono text-sm text-ink">
          服务页 {stats.visits.services.services ?? 0} · FAQ 页 {stats.visits.faq.faq ?? 0}
        </p>
      </section>

      <section className="mt-8 border-b border-hairline pb-6">
        <h2 className="font-sans text-sm text-ink">派生指标</h2>
        <p className="mt-3 font-mono text-sm text-ink">
          近 7 天发布 {stats.derived.publishedLast7Days} · 待锚定版本 {stats.derived.pendingAnchorVersions} ·
          反转率 {overturnText}
        </p>
        <p className="mt-2 font-sans text-xs text-ink-soft">
          反转率 = 被推翻 / (已验证 + 被推翻)，已发布轨迹口径；「—」表示暂无已裁决轨迹。
        </p>
      </section>
    </>
  );
}
