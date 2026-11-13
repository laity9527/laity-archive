/**
 * 文件：src/app/admin/logs/page.tsx
 * 描述：后台日志列表：全部 / 草稿 / 已发布三态、标题搜索、页码分页；编辑仍跳现有编辑页
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（Phase C）。此前后台只能从概览「最近动态」的 5 条里进编辑，
 *               第 6 条及更早的草稿没有入口；本页补上列表、状态筛选与分页。
 *               只读列表，发布/下架/删除仍走原编辑页与 Server Action，不做批量操作。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { pickParam } from "@/lib/forms";
import {
  getAdminLogList,
  type AdminLogStatus,
} from "@/lib/logs";

export const metadata: Metadata = {
  title: "日志",
  robots: { index: false, follow: false },
};

// 本页查库与读筛选参数，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type AdminLogsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
};

const STATUSES: { key: AdminLogStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "published", label: "已发布" },
];

function parseStatus(value: string | undefined): AdminLogStatus {
  return value === "draft" || value === "published" ? value : "all";
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function listHref(params: {
  status?: AdminLogStatus;
  q?: string;
  page?: number;
}) {
  const query = new URLSearchParams();

  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }

  const search = query.toString();

  return search ? `/admin/logs?${search}` : "/admin/logs";
}

export default async function AdminLogsPage({
  searchParams,
}: AdminLogsPageProps) {
  const params = await searchParams;
  const status = parseStatus(pickParam(params.status));
  const q = pickParam(params.q);
  const page = parsePage(pickParam(params.page));
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs");
  }

  const result = await getAdminLogList(session.userId, { status, q, page });
  const { items, total, pageCount, counts } = result;
  const hasFilter = Boolean(q) || status !== "all";

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            ARCHIVE LOGS
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">日志</h1>
        </div>
        <Link
          href="/admin/logs/new"
          className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
        >
          新建日志
        </Link>
      </header>

      <p className="mt-4 font-sans text-[11px] text-ink-soft">
        共 {counts.all} 条 · 草稿 {counts.draft} · 已发布 {counts.published}
      </p>

      <nav
        aria-label="按状态筛选"
        className="mt-6 flex flex-wrap gap-6 border-b border-hairline pb-2"
      >
        {STATUSES.map((item) => {
          const active = status === item.key;
          const count =
            item.key === "all"
              ? counts.all
              : item.key === "draft"
                ? counts.draft
                : counts.published;

          return (
            <Link
              key={item.key}
              href={listHref({ status: item.key, q })}
              aria-current={active ? "true" : undefined}
              className={`border-b pb-1 font-sans text-xs ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {item.label}{" "}
              <span className="font-mono text-[10px]">{count}</span>
            </Link>
          );
        })}
      </nav>

      <form method="get" className="mt-6 flex flex-wrap items-baseline gap-4">
        <label
          htmlFor="admin-log-search"
          className="font-sans text-[10px] text-ink-soft"
        >
          搜索标题
        </label>
        <input
          id="admin-log-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="输入标题关键词"
          className="border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
        />
        {status !== "all" && (
          <input type="hidden" name="status" value={status} />
        )}
        <button
          type="submit"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          搜索
        </button>
        {hasFilter && (
          <Link
            href="/admin/logs"
            className="border-b border-transparent font-sans text-[11px] text-ink-soft hover:border-ink hover:text-ink"
          >
            清除筛选 ×
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <div className="mt-8">
          <p className="border-t border-ink py-6 font-sans text-xs text-ink-soft">
            {hasFilter ? "没有符合条件的日志" : "还没有日志"}
          </p>
          {!hasFilter && (
            <Link
              href="/admin/logs/new"
              className="border-b border-ink font-sans text-xs text-ink"
            >
              新建第一条日志 →
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {items.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-hairline py-4"
            >
              <span aria-hidden className="font-mono text-[10px] text-ink">
                {log.isPublished ? "●" : "○"}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/logs/${log.id}/edit`}
                  className="text-base hover:underline hover:decoration-1 hover:underline-offset-4"
                >
                  {log.title}
                </Link>
                <p className="mt-1 font-mono text-[10px] text-ink-soft">
                  {log.project.name}
                  {log.user
                    ? ` · /u/${log.user.handle}/logs/${log.slug}`
                    : ""}
                </p>
              </div>

              <span className="text-[11px] text-ink-soft">
                <span className="font-sans">
                  {log.isPublished ? "已发布" : "草稿"} ·{" "}
                </span>
                <span className="font-mono">
                  {log.updatedAt.toISOString().slice(0, 10)}
                </span>
              </span>

              <span className="ml-auto flex items-baseline gap-4 font-sans text-[11px]">
                <Link
                  href={`/admin/logs/${log.id}/edit`}
                  className="border-b border-ink text-ink"
                >
                  编辑
                </Link>
                {log.isPublished && log.user && (
                  <Link
                    href={`/u/${log.user.handle}/logs/${log.slug}`}
                    className="border-b border-ink text-ink"
                  >
                    看前台
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-hairline pt-4 font-sans text-[11px] text-ink-soft">
          <span>
            第 {page} / {pageCount} 页 · 共 {total} 条
          </span>
          <span className="flex items-baseline gap-4">
            {page > 1 && (
              <Link
                href={listHref({ status, q, page: page - 1 })}
                className="border-b border-ink text-ink"
              >
                ← 上一页
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={listHref({ status, q, page: page + 1 })}
                className="border-b border-ink text-ink"
              >
                下一页 →
              </Link>
            )}
          </span>
        </div>
      )}
    </>
  );
}
