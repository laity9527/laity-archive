/**
 * 文件：src/app/admin/leads/[id]/page.tsx
 * 描述：线索详情页：完整字段展示、标记回复（replyNote）、关闭、软删除
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.3）。回复与关闭的失败码经 URL 回传
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { getLead } from "@/lib/lead-admin";
import { closeLeadAction, deleteLeadAction, replyLeadAction } from "@/lib/lead-actions";

export const metadata: Metadata = {
  title: "线索详情",
  robots: { index: false, follow: false },
};

export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
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

export default async function AdminLeadDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/leads/${id}`)}`);

  const lead = await getLead(id);
  if (!lead) {
    notFound();
  }

  const error = pick(query.error);
  const replied = pick(query.replied);
  const closed = pick(query.closed);
  const deleted = pick(query.deleted);
  const canReply = lead.status === "NEW" || lead.status === "SPAM";
  const canClose = lead.status !== "ARCHIVED";

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">
            线索详情
            {lead.deletedAt && <span className="ml-2 border border-ink px-1.5 text-[10px]">已删除</span>}
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">{lead.name}</h1>
        </div>
        <Link href="/admin/leads" className="border-b border-ink font-sans text-xs text-ink">
          ← 线索列表
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          {ERROR_TEXT[error] ?? "操作没有完成。"}
        </p>
      )}
      {replied && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已标记回复。</p>}
      {closed && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已关闭。</p>}
      {deleted && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已删除（软删除）。</p>}

      <dl className="mt-8 grid gap-4 border-y border-hairline py-5 sm:grid-cols-2">
        <div>
          <dt className="font-sans text-xs text-ink-soft">邮箱</dt>
          <dd className="mt-1 font-sans text-sm text-ink">{lead.email}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">需求类型</dt>
          <dd className="mt-1 font-sans text-sm text-ink">{lead.reqType}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">状态</dt>
          <dd className="mt-1 font-sans text-sm text-ink">{lead.status}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">提交时间（UTC）</dt>
          <dd className="mt-1 font-mono text-sm text-ink">
            {lead.createdAt.toISOString().slice(0, 16).replace("T", " ")}
          </dd>
        </div>
        {lead.ipHash && (
          <div>
            <dt className="font-sans text-xs text-ink-soft">来源（ipHash）</dt>
            <dd className="mt-1 font-mono text-xs text-ink-soft">{lead.ipHash.slice(0, 12)}…</dd>
          </div>
        )}
        {lead.ua && (
          <div>
            <dt className="font-sans text-xs text-ink-soft">UA</dt>
            <dd className="mt-1 font-mono text-xs text-ink-soft">{lead.ua.slice(0, 60)}</dd>
          </div>
        )}
        {lead.evidenceReq && (
          <div>
            <dt className="font-sans text-xs text-ink-soft">希望留存的交付证据</dt>
            <dd className="mt-1 font-sans text-sm text-ink">{lead.evidenceReq}</dd>
          </div>
        )}
        {lead.replyNote && (
          <div>
            <dt className="font-sans text-xs text-ink-soft">回复备注</dt>
            <dd className="mt-1 font-sans text-sm text-ink">{lead.replyNote}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        <h2 className="font-sans text-sm text-ink-soft">留言</h2>
        <p className="mt-2 border border-hairline px-4 py-3 font-serif text-sm leading-relaxed text-ink">
          {lead.message}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {canReply && (
          <form action={replyLeadAction} className="flex flex-col gap-2 border-y border-hairline py-4">
            <input type="hidden" name="id" value={lead.id} />
            <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
              回复备注
              <textarea
                name="replyNote"
                rows={3}
                maxLength={500}
                placeholder="记录回复内容（对外发送由你本人执行）"
                className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
              />
            </label>
            <SubmitButton label="标记已回复" pendingLabel="提交中…" className="self-start border border-ink px-4 py-2 font-sans text-xs text-ink" />
          </form>
        )}
        <div className="flex flex-col gap-3 border-y border-hairline py-4">
          {canClose && (
            <form action={closeLeadAction} className="flex items-center gap-3 font-sans text-xs">
              <input type="hidden" name="id" value={lead.id} />
              <button type="submit" className="border border-ink px-4 py-2 text-ink">关闭线索</button>
            </form>
          )}
          <form action={deleteLeadAction} className="flex items-center gap-3 font-sans text-xs">
            <input type="hidden" name="id" value={lead.id} />
            <label className="flex items-center gap-1 text-ink-soft">
              <input type="checkbox" name="confirmDelete" />
              确认
            </label>
            <button type="submit" className="border-b border-ink text-ink">软删除</button>
          </form>
        </div>
      </div>
    </>
  );
}
