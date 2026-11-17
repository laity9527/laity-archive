/**
 * 文件：src/app/admin/logs/[id]/history/page.tsx
 * 描述：修订历史：列出最近 20 个发布版本，选中一版与当前草稿做行级 diff
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（V4 P3 §7.6）。发布时把旧版本追加进 Revision；当前版本始终在 Log 行上，
 *               本页只读，不写库、不发布。列表按创建时间倒序，默认选最新一条；缺 rev 参数不报错。
 *               单侧超过 2000 行由 text-diff 截断并显示提示，不在页面里做大数组计算。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { getLogRevisions } from "@/lib/logs";
import { diffLines, type DiffResult } from "@/lib/text-diff";

export const metadata: Metadata = {
  title: "修订历史",
  robots: { index: false, follow: false },
};

export const instant = false;

type HistoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rev?: string | string[] }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function DiffBlock({ title, result }: { title: string; result: DiffResult }) {
  const changed = result.lines.some((line) => line.kind !== "same");

  return (
    <section className="mt-10">
      <h2 className="font-sans text-sm text-ink-soft">{title}</h2>
      {result.truncated && (
        <p className="mt-2 font-sans text-xs text-ink-soft">
          超过 2000 行，只显示前 2000 行；完整内容请直接对照两版原文。
        </p>
      )}
      {!changed ? (
        <p className="mt-3 border-t border-hairline py-4 font-sans text-xs text-ink-soft">
          这一部分没有差异。
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto border-t border-hairline py-3 font-mono text-[13px] leading-relaxed">
          {result.lines.map((line, index) => (
            <div key={`${line.kind}-${index}`} className="flex gap-2 whitespace-pre-wrap break-words">
              <span aria-hidden className="w-3 shrink-0 text-ink-soft">
                {line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "}
              </span>
              <span className={line.kind === "remove" ? "text-ink-soft line-through" : "text-ink"}>
                {line.text || " "}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function HistoryPage({ params, searchParams }: HistoryPageProps) {
  const { id } = await params;
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/logs/${id}/history`)}`);
  }

  const log = await getLogRevisions(id, session.userId);

  if (!log) {
    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-tight">修订历史</h1>
          <Link href="/admin/logs" className="border-b border-ink font-sans text-xs text-ink">
            ← 日志列表
          </Link>
        </div>
        <p className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          LOG_002 · 这条日志不存在，可能已被删除。
        </p>
      </>
    );
  }

  const revisions = log.revisions;
  const selected = revisions.find((item) => item.id === pick(query.rev)) ?? revisions[0] ?? null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">修订历史 · 共 {revisions.length} 版</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">{log.title}</h1>
        </div>
        <span className="flex flex-wrap items-baseline gap-5 font-sans text-xs">
          <Link href={`/admin/logs/${log.id}/edit`} className="border-b border-ink text-ink">
            返回编辑
          </Link>
          <Link href={`/admin/logs/${log.id}/snapshot`} className="border-b border-ink text-ink">
            上次发布快照
          </Link>
        </span>
      </div>

      {!selected ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有历史版本。发布第二次起，旧版本会出现在这里；每篇最多保留 20 条。
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <h2 className="font-sans text-xs text-ink-soft">版本列表</h2>
              <ol className="mt-3 border-t border-hairline">
                {revisions.map((revision) => {
                  const active = revision.id === selected.id;
                  return (
                    <li key={revision.id} className="border-b border-hairline">
                      <Link
                        href={`?rev=${revision.id}`}
                        aria-current={active ? "true" : undefined}
                        className={`block py-3 font-mono text-xs ${
                          active
                            ? "border-l-2 border-brown pl-3 text-ink"
                            : "border-l-2 border-transparent pl-3 text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        <span className="block">{formatTime(revision.createdAt)} UTC</span>
                        <span className="mt-1 block text-ink-soft">
                          {revision.contentHash.slice(0, 8)}… ·{" "}
                          {revision.title.length + revision.beforeContent.length + (revision.afterContent?.length ?? 0)} 字符
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <div className="min-w-0">
              <div className="border border-ink px-4 py-3 font-sans text-xs leading-relaxed text-ink">
                <p>
                  选中版本 ·{" "}
                  <span className="font-mono">{formatTime(selected.publishedAt)} UTC</span> ·{" "}
                  <span className="font-mono">{selected.contentHash.slice(0, 8)}…</span>
                </p>
                <p className="mt-1 text-ink-soft">
                  标题：{selected.title}
                  {selected.title !== log.title ? ` → ${log.title}` : "（与当前一致）"}
                </p>
                {selected.tags.length > 0 && (
                  <p className="mt-1 font-mono text-ink-soft">{selected.tags.join(" · ")}</p>
                )}
                <p className="mt-2 text-ink-soft">
                  下方以「选中版本 → 当前草稿」方向比较：+ 为当前新增，- 为选中版本中被删除。
                </p>
              </div>

              <DiffBlock
                title="BEFORE"
                result={diffLines(selected.beforeContent, log.beforeContent)}
              />
              <DiffBlock
                title="AFTER"
                result={diffLines(selected.afterContent ?? "", log.afterContent ?? "")}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
