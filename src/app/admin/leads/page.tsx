/**
 * 文件：src/app/admin/leads/page.tsx
 * 描述：后台线索列表：状态筛选、分页、行内标记回复、关闭、软删除（含回收站可见）
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.3）。软删除只翻 deletedAt，列表照常可见并带「已删除」标记
 * - 2026-11-20: a11y 二期 L3：确认复选框补 aria-label（带上线索名，满足 Label in Name）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { listLeads, type LeadStatusFilter } from "@/lib/lead-admin";
import { closeLeadAction, deleteLeadAction } from "@/lib/lead-actions";

export const metadata: Metadata = {
  title: "线索",
  robots: { index: false, follow: false },
};

export const instant = false;

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索",
  REPLIED: "已回复",
  ARCHIVED: "已关闭",
  SPAM: "垃圾",
};

const STATUS_FILTERS: { value: LeadStatusFilter; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "NEW", label: "新线索" },
  { value: "REPLIED", label: "已回复" },
  { value: "ARCHIVED", label: "已关闭" },
  { value: "SPAM", label: "垃圾" },
];

type Props = {
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
    error?: string | string[];
    replied?: string | string[];
    closed?: string | string[];
    deleted?: string | string[];
  }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ERROR_TEXT: Record<string, string> = {
  LEAD_003: "线索不存在，可能已被删除。",
  LEAD_004: "线索状态不能这样变更，或删除前未勾选确认。",
};

export default async function AdminLeadsPage({ searchParams }: Props) {
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fleads");

  const rawStatus = pick(query.status);
  const status: LeadStatusFilter =
    rawStatus && STATUS_FILTERS.some((f) => f.value === rawStatus)
      ? (rawStatus as LeadStatusFilter)
      : "ALL";
  const page = Math.max(1, Number(pick(query.page) ?? "1") || 1);

  const { items, total } = await listLeads({ status, page, pageSize: PAGE_SIZE });
  const error = pick(query.error);
  const replied = pick(query.replied);
  const closed = pick(query.closed);
  const deleted = pick(query.deleted);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLinks = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">线索 · 共 {total} 条</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">线索</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 font-sans text-xs">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/leads${filter.value === "ALL" ? "" : `?status=${filter.value}`}`}
            className={`border px-3 py-1 ${
              status === filter.value ? "border-brown text-brown" : "border-hairline text-ink-soft"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          {ERROR_TEXT[error] ?? "操作没有完成。"}
        </p>
      )}
      {replied && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已标记回复。</p>}
      {closed && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已关闭。</p>}
      {deleted && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已删除（软删除，仍在回收站可见）。</p>}

      {items.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          这个筛选下还没有线索。
        </p>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {items.map((lead) => (
            <li key={lead.id} className="border-b border-hairline py-4">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-base hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {lead.name}
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-soft">
                    {lead.email} · {lead.reqType}
                    {lead.deletedAt && <span className="ml-2 border border-ink px-1.5 text-[10px]">已删除</span>}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink-soft">
                    {STATUS_LABELS[lead.status] ?? lead.status} · {lead.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                  <Link href={`/admin/leads/${lead.id}`} className="border-b border-ink text-ink">
                    详情
                  </Link>
                  {lead.status !== "REPLIED" && lead.status !== "ARCHIVED" && (
                    <form action={closeLeadAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="backTo" value="/admin/leads" />
                      <button type="submit" className="border-b border-ink text-ink">关闭</button>
                    </form>
                  )}
                  <form action={deleteLeadAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={lead.id} />
                    <input type="hidden" name="backTo" value="/admin/leads" />
                    <label className="flex items-center gap-1 text-ink-soft">
                      <input
                        type="checkbox"
                        name="confirmDelete"
                        aria-label={`确认删除「${lead.name}」`}
                      />
                      确认
                    </label>
                    <button type="submit" className="border-b border-ink text-ink">删除</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap gap-3 font-sans text-xs">
          {pageLinks.map((n) => (
            <Link
              key={n}
              href={`/admin/leads?status=${status}&page=${n}`}
              className={`border px-3 py-1 ${n === page ? "border-brown text-brown" : "border-hairline text-ink-soft"}`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
