/**
 * 文件：src/app/admin/logs/page.tsx
 * 描述：后台日志列表：全部 / 草稿 / 已发布三态、标题搜索、页码分页；编辑仍跳现有编辑页
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（Phase C）。此前后台只能从概览「最近动态」的 5 条里进编辑，
 *               第 6 条及更早的草稿没有入口；本页补上列表、状态筛选与分页。
 *               只读列表，发布/下架/删除仍走原编辑页与 Server Action，不做批量操作。
 * - 2026-11-16: B3 第一刀：行内加「发布 / 下架」——发布复用 publishLog（按库中正文算摘要 + 敏感扫描），
 *               下架复用 unpublishLog；成功后回本页，结果由 Toast 提示。删除仍只在编辑页（需输 slug 确认）
 * - 2026-11-16: 评审 G9/A3：加项目筛选（下拉复用 listProjectOptions 的 slug+名称），
 *               与状态 tab、标题搜索、分页互相保留；项目用关系过滤，不存在的 slug 得空集而非报错
 * - 2026-11-16: 评审 A2/A5：加排序（URL 参数，不写 cookie）与每行「预览」入口（登录态草稿预览）
 * - 2026-11-16: 评审 A2 收口：卡片行改表格（标题/更新时间/操作三列 + 选择与状态），
 *               窄屏横向滚动；批量勾选仍通过 form="bulk-form" 关联，不动批量下架语义
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
import { listProjectOptions } from "@/lib/projects";
import { parseAdminSort, type AdminLogSort } from "@/lib/sort-preference";
import {
  bulkUnpublishAction,
  quickPublishAction,
  quickUnpublishAction,
} from "../log-actions";

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
    project?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

const STATUSES: { key: AdminLogStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "published", label: "已发布" },
];

// 后台排序只有三个选项：列表的主要用途是“接着改”，所以默认最近更新在前
const SORTS: { key: AdminLogSort; label: string }[] = [
  { key: "updated", label: "最近更新" },
  { key: "oldest", label: "最早更新" },
  { key: "title", label: "标题 A–Z" },
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
  project?: string;
  sort?: AdminLogSort;
  page?: number;
}) {
  const query = new URLSearchParams();

  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.project) {
    query.set("project", params.project);
  }

  if (params.sort && params.sort !== "updated") {
    query.set("sort", params.sort);
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
  const project = pickParam(params.project);
  const sort = parseAdminSort(pickParam(params.sort));
  const page = parsePage(pickParam(params.page));
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs");
  }

  // 下拉只取 slug 与名称；项目多了也只多一行选项，不额外查日志计数
  const [result, projectOptions] = await Promise.all([
    getAdminLogList(session.userId, { status, q, project, sort, page }),
    listProjectOptions(session.userId),
  ]);
  const { items, total, pageCount, counts } = result;
  const projectName = projectOptions.find((item) => item.slug === project)?.name;
  const hasFilter = Boolean(q) || Boolean(project) || status !== "all";

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            ARCHIVE LOGS
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">日志</h1>
        </div>
        <span className="flex flex-wrap items-baseline gap-3">
          <Link
            href="/admin/logs/import"
            className="border border-hairline px-4 py-2 font-sans text-xs text-ink hover:border-ink"
          >
            导入
          </Link>
          <Link
            href="/admin/logs/new"
            className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
          >
            新建日志
          </Link>
        </span>
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
              href={listHref({ status: item.key, q, project, sort })}
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

      <nav
        aria-label="排序"
        className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2"
      >
        <span className="font-sans text-[10px] text-ink-soft">排序</span>
        {SORTS.map((item) => {
          const active = sort === item.key;

          return (
            <Link
              key={item.key}
              href={listHref({ status, q, project, sort: item.key })}
              aria-current={active ? "true" : undefined}
              className={`border-b pb-0.5 font-sans text-[11px] ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {item.label}
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
        {sort !== "updated" && (
          <input type="hidden" name="sort" value={sort} />
        )}
        {projectOptions.length > 0 && (
          <span className="flex items-baseline gap-2">
            <label
              htmlFor="admin-log-project"
              className="font-sans text-[10px] text-ink-soft"
            >
              项目
            </label>
            <select
              id="admin-log-project"
              name="project"
              defaultValue={project ?? ""}
              className="border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
            >
              <option value="">全部项目</option>
              {projectOptions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </span>
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

      {project && (
        <p className="mt-3 font-sans text-[11px] text-ink-soft">
          {projectName
            ? `当前只看项目「${projectName}」`
            : "当前项目筛选没有匹配的项目，结果为空"}
        </p>
      )}

      {/* 批量操作只做“下架”：发布需逐条确认摘要与敏感扫描，删除是破坏性动作 */}
      <form
        id="bulk-form"
        action={bulkUnpublishAction}
        className="mt-6 flex flex-wrap items-baseline gap-4 border-b border-hairline pb-4"
      >
        <button
          type="submit"
          className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
        >
          批量下架选中
        </button>
        <span className="font-sans text-[11px] text-ink-soft">
          勾选左侧方框后提交；删除仍需逐条在编辑页确认
        </span>
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
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-y border-hairline font-sans text-[10px] text-ink-soft">
                <th scope="col" className="w-8 py-2">
                  <span className="sr-only">选择</span>
                </th>
                <th scope="col" className="w-6 py-2">
                  <span className="sr-only">状态</span>
                </th>
                <th scope="col" className="py-2 font-normal">
                  标题
                </th>
                <th scope="col" className="py-2 font-normal">
                  更新时间
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log.id} className="border-b border-hairline align-top">
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      form="bulk-form"
                      name="id"
                      value={log.id}
                      aria-label={`选择「${log.title}」用于批量操作`}
                      className="h-3.5 w-3.5 accent-ink"
                    />
                  </td>
                  <td
                    aria-hidden
                    className="py-3 pr-2 font-mono text-[10px] text-ink"
                  >
                    {log.isPublished ? "●" : "○"}
                  </td>

                  <td className="py-3 pr-6">
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
                  </td>

                  <td className="whitespace-nowrap py-3 pr-6 text-[11px] text-ink-soft">
                    <span className="font-sans">
                      {log.isPublished ? "已发布" : "草稿"} ·{" "}
                    </span>
                    <span className="font-mono">
                      {log.updatedAt.toISOString().slice(0, 10)}
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    <span className="flex flex-wrap items-baseline justify-end gap-4 font-sans text-[11px]">
                      <form
                        action={
                          log.isPublished
                            ? quickUnpublishAction
                            : quickPublishAction
                        }
                      >
                        <input type="hidden" name="id" value={log.id} />
                        <button
                          type="submit"
                          className="border-b border-ink text-ink"
                        >
                          {log.isPublished ? "下架" : "发布"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/logs/${log.id}/edit`}
                        className="border-b border-ink text-ink"
                      >
                        编辑
                      </Link>
                      <Link
                        href={`/admin/logs/${log.id}/preview`}
                        className="border-b border-ink text-ink"
                      >
                        预览
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-hairline pt-4 font-sans text-[11px] text-ink-soft">
          <span>
            {hasFilter ? "筛选后 " : ""}第 {page} / {pageCount} 页 · 共 {total} 条
          </span>
          <span className="flex items-baseline gap-4">
            {page > 1 && (
              <Link
                href={listHref({ status, q, project, sort, page: page - 1 })}
                className="border-b border-ink text-ink"
              >
                ← 上一页
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={listHref({ status, q, project, sort, page: page + 1 })}
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
