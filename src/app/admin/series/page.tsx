/**
 * 文件：src/app/admin/series/page.tsx
 * 描述：后台系列管理：列表、新建、改名/摘要、删除（有日志拒绝）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V4 P2 Series 第三阶段）。slug 创建后不变；删除前必须勾选确认，
 *               有日志时由服务端拒绝（SERIES_003）。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { getAdminSeries, listAdminSeries } from "@/lib/series-admin";
import { deleteSeriesAction, saveSeriesAction } from "@/app/admin/series-actions";

export const metadata: Metadata = {
  title: "系列",
  robots: { index: false, follow: false },
};

export const instant = false;

type Props = {
  searchParams: Promise<{
    id?: string | string[];
    error?: string | string[];
    saved?: string | string[];
    deleted?: string | string[];
  }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ERROR_TEXT: Record<string, string> = {
  SERIES_001: "系列名称已存在或标识冲突。",
  SERIES_002: "名称必填且不超过 40 字，摘要不超过 120 字。",
  SERIES_003: "该系列下仍有日志，先把日志解绑后才能删除。",
  SERIES_004: "系列不存在，或删除前未勾选确认。",
};

export default async function AdminSeriesPage({ searchParams }: Props) {
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fseries");

  const id = pick(query.id);
  const [list, editing] = await Promise.all([
    listAdminSeries(session.userId),
    id ? getAdminSeries(id, session.userId) : Promise.resolve(null),
  ]);
  const error = pick(query.error);
  const saved = pick(query.saved);
  const deleted = pick(query.deleted);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">系列 · 共 {list.length} 个</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">系列</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          {ERROR_TEXT[error] ?? "操作没有完成。"}
        </p>
      )}
      {saved && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已保存。</p>}
      {deleted && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已删除。</p>}

      <form action={saveSeriesAction} className="mt-8 grid gap-4 border-y border-hairline py-5 sm:grid-cols-[1fr_2fr_auto]">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          名称
          <input
            name="name"
            required
            maxLength={40}
            defaultValue={editing?.name ?? ""}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          摘要（可空，≤120 字）
          <input
            name="summary"
            maxLength={120}
            defaultValue={editing?.summary ?? ""}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="flex items-end gap-3">
          <button type="submit" className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper">
            {editing ? "保存修改" : "新建系列"}
          </button>
          {editing && (
            <Link href="/admin/series" className="border-b border-ink font-sans text-xs text-ink">
              取消
            </Link>
          )}
        </div>
      </form>

      {list.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有系列。新建后，日志编辑器里可填同名系列。
        </p>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {list.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-hairline py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/series?id=${item.id}`} className="text-base hover:underline hover:decoration-1 hover:underline-offset-4">
                  {item.name}
                </Link>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">{item.slug} · {item.count} 篇日志</p>
                {item.summary && <p className="mt-1 font-sans text-xs text-ink-soft">{item.summary}</p>}
              </div>
              <form action={deleteSeriesAction} className="flex items-baseline gap-3 font-sans text-xs">
                <input type="hidden" name="id" value={item.id} />
                <label className="flex items-center gap-1 text-ink-soft">
                  <input type="checkbox" name="confirmDelete" />
                  确认
                </label>
                <button type="submit" className="border-b border-ink text-ink">删除</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
