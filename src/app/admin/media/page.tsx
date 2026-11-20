/**
 * 文件：src/app/admin/media/page.tsx
 * 描述：后台媒体库：上传、列表（按轨迹筛选/分页）、预览、绑定/解绑轨迹、isEvidence 标记、软删除
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.3）。软删除只翻 deletedAt，列表照常可见并带标记
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：绑定轨迹 select 补 aria-label（此前是无名控件）；
 *               分页当前页补 aria-current、页码链接补"第 N 页"名称
 * - 2026-11-19: V5 Phase 6 O2：筛选表单改原生 GET 提交（对齐 /admin/logs 筛选口径）——
 *               select 名 traceFilter→traceId（与 URL 参数/DAL 入参一致），应用筛选由 Link 改提交按钮，
 *               表单字段即 URL query，读取 select 当前值后跳转
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { MediaUpload } from "@/components/admin/MediaUpload";
import {
  listMedia,
  listTraceOptions,
} from "@/lib/media-admin";
import {
  bindMediaAction,
  deleteMediaAction,
  setMediaEvidenceAction,
  unbindMediaAction,
} from "@/lib/media-actions";

export const metadata: Metadata = {
  title: "媒体库",
  robots: { index: false, follow: false },
};

export const instant = false;

const PAGE_SIZE = 10;

type Props = {
  searchParams: Promise<{
    traceId?: string | string[];
    page?: string | string[];
    error?: string | string[];
    bound?: string | string[];
    unbound?: string | string[];
    evidence?: string | string[];
    deleted?: string | string[];
  }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ERROR_TEXT: Record<string, string> = {
  MEDIA_003: "媒体或目标轨迹不存在，可能已被删除。",
  MEDIA_004: "媒体状态不能这样变更，或删除前未勾选确认。",
};

export default async function AdminMediaPage({ searchParams }: Props) {
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fmedia");

  const traceFilter = pick(query.traceId) ?? "";
  const page = Math.max(1, Number(pick(query.page) ?? "1") || 1);

  const [media, traces] = await Promise.all([
    listMedia({ traceId: traceFilter || undefined, page, pageSize: PAGE_SIZE }),
    listTraceOptions(session.userId),
  ]);

  const error = pick(query.error);
  const bound = pick(query.bound);
  const unbound = pick(query.unbound);
  const evidence = pick(query.evidence);
  const deleted = pick(query.deleted);

  const totalPages = Math.max(1, Math.ceil(media.total / PAGE_SIZE));
  const pageLinks = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">媒体库 · 共 {media.total} 条</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">媒体库</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      <MediaUpload />

      {error && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          {ERROR_TEXT[error] ?? "操作没有完成。"}
        </p>
      )}
      {bound && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已绑定轨迹。</p>}
      {unbound && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已解绑。</p>}
      {evidence && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">证据标记已更新。</p>}
      {deleted && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已删除（软删除，仍在列表可见）。</p>}

      <form method="get" action="/admin/media" className="mt-8 grid gap-3 border-y border-hairline py-4 sm:grid-cols-[200px_auto]">
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          按轨迹筛选
          <select
            name="traceId"
            defaultValue={traceFilter}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          >
            <option value="">全部</option>
            {traces.map((trace) => (
              <option key={trace.id} value={trace.id}>
                {trace.title}（{trace.slug}）
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="border border-ink px-4 py-2 font-sans text-xs text-ink"
          >
            应用筛选
          </button>
        </div>
      </form>

      {media.items.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有媒体。用上方上传入口添加。
        </p>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {media.items.map((item) => (
            <li key={item.id} className="border-b border-hairline py-4">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-ink">
                    {item.fileName}
                    {item.originalName && item.originalName !== item.fileName && (
                      <span className="ml-2 font-sans text-xs text-ink-soft">原始名：{item.originalName}</span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink-soft">
                    {item.mimeType} · {item.size} B
                    {item.hash && <> · {item.hash.slice(0, 8)}…</>}
                    {item.traceId ? <> · 已绑定</> : <> · 未绑定</>}
                    {item.isEvidence && <> · 证据</>}
                    {item.deletedAt && <> · 已删除</>}
                  </p>
                  <div className="mt-2">
                    {item.mimeType.startsWith("image/") ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.ossUrl}
                          alt={item.alt ?? item.fileName}
                          className="max-h-32 border border-hairline"
                        />
                      </>
                    ) : (
                      <a
                        href={item.ossUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-b border-ink font-sans text-xs text-ink"
                      >
                        打开文件
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 font-sans text-xs">
                  {item.traceId ? (
                    <form action={unbindMediaAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="backTo" value="/admin/media" />
                      <button type="submit" className="border-b border-ink text-ink">解绑</button>
                    </form>
                  ) : (
                    <form action={bindMediaAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="backTo" value="/admin/media" />
                      <select
                        name="traceId"
                        defaultValue=""
                        aria-label={`为「${item.fileName}」选择要绑定的轨迹`}
                        className="border border-hairline bg-transparent px-2 py-1 text-xs text-ink"
                      >
                        <option value="" disabled>
                          选择轨迹
                        </option>
                        {traces.map((trace) => (
                          <option key={trace.id} value={trace.id}>
                            {trace.title}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="border-b border-ink text-ink">绑定</button>
                    </form>
                  )}
                  <form action={setMediaEvidenceAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="backTo" value="/admin/media" />
                    <label className="flex items-center gap-1 text-ink-soft">
                      <input type="checkbox" name="isEvidence" defaultChecked={item.isEvidence} />
                      证据
                    </label>
                    <button type="submit" className="border-b border-ink text-ink">保存标记</button>
                  </form>
                  <form action={deleteMediaAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="backTo" value="/admin/media" />
                    <label className="flex items-center gap-1 text-ink-soft">
                      <input type="checkbox" name="confirmDelete" />
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
        <nav aria-label="分页" className="mt-6 flex flex-wrap gap-3 font-sans text-xs">
          {pageLinks.map((n) => (
            <Link
              key={n}
              href={`/admin/media?traceId=${traceFilter}&page=${n}`}
              aria-label={`第 ${n} 页`}
              aria-current={n === page ? "page" : undefined}
              className={`border px-3 py-1 ${n === page ? "border-brown text-brown" : "border-hairline text-ink-soft"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
