/**
 * 文件：src/app/admin/audit/page.tsx
 * 描述：审计列表：最近 100 条后台动作，可按 action 过滤；只读，不提供删除
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（V4 P3 §7.7）。审计写入在 src/lib/audit.ts，动作层尽力而为；
 *               本页只读展示时间 / 动作 / 对象 / 操作者 / 非敏感 meta，不展示正文或 token。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import {
  AUDIT_ACTION_LABELS,
  listAuditEvents,
} from "@/lib/audit";

export const metadata: Metadata = {
  title: "审计",
  robots: { index: false, follow: false },
};

export const instant = false;

type AuditPageProps = {
  searchParams: Promise<{ action?: string | string[] }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(value: Date) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function metaText(meta: unknown) {
  if (!meta) return "—";
  const text = JSON.stringify(meta);
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Faudit");
  }

  const action = pick(query.action);
  const events = await listAuditEvents(action);
  const actions = Object.keys(AUDIT_ACTION_LABELS);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">审计 · 最近 100 条</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">后台动作</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      <nav aria-label="按动作筛选" className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-hairline py-3 font-sans text-xs">
        <Link
          href="/admin/audit"
          aria-current={!action ? "true" : undefined}
          className={!action ? "border-b border-ink text-ink" : "border-b border-transparent text-ink-soft hover:border-ink hover:text-ink"}
        >
          全部
        </Link>
        {actions.map((item) => (
          <Link
            key={item}
            href={`/admin/audit?action=${encodeURIComponent(item)}`}
            aria-current={action === item ? "true" : undefined}
            className={
              action === item
                ? "border-b border-ink text-ink"
                : "border-b border-transparent text-ink-soft hover:border-ink hover:text-ink"
            }
          >
            {AUDIT_ACTION_LABELS[item]}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有审计记录。发布、下架、删除或预览链接操作后会出现在这里。
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="border-y border-hairline font-sans text-xs text-ink-soft">
                <th scope="col" className="py-2 font-normal">时间（UTC）</th>
                <th scope="col" className="py-2 font-normal">动作</th>
                <th scope="col" className="py-2 font-normal">对象</th>
                <th scope="col" className="py-2 font-normal">操作者</th>
                <th scope="col" className="py-2 font-normal">摘要</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-hairline align-top font-sans text-xs">
                  <td className="whitespace-nowrap py-3 pr-5 font-mono text-ink-soft">
                    {formatTime(event.createdAt)}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-5 text-ink">
                    {AUDIT_ACTION_LABELS[event.action] ?? event.action}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-5 font-mono text-ink-soft">
                    {event.targetType} · {event.targetId.slice(0, 10)}…
                  </td>
                  <td className="whitespace-nowrap py-3 pr-5 font-mono text-ink-soft">
                    {event.actorId.slice(0, 10)}…
                  </td>
                  <td className="py-3 font-mono text-ink-soft">{metaText(event.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
