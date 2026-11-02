/**
 * 文件：src/app/admin/logs/[id]/edit/page.tsx
 * 描述：编辑日志：回填全部字段、保存即退回草稿、发布时写哈希与服务器时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 * - 2026-11-02: 已发布状态下增"下架"动作与 UNPUBLISHED 提示（补 SPEC:117 的 unpublishLog）
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  publishLogAction,
  saveLogAction,
  unpublishLogAction,
} from "@/app/admin/log-actions";
import { Editor } from "@/components/Editor";
import { errorTextOf } from "@/lib/error-text";
import { pickParam } from "@/lib/forms";
import { getAdminLogById } from "@/lib/logs";
import { listProjects } from "@/lib/projects";
import { toDateTimeLocal } from "@/lib/publish";

// 本页读会话与单条日志，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type EditLogPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
    published?: string | string[];
    unpublished?: string | string[];
  }>;
};

export default async function EditLogPage({
  params,
  searchParams,
}: EditLogPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const log = await getAdminLogById(id);

  if (!log) {
    notFound();
  }

  const projects = await listProjects();
  const errorCode = pickParam(query.error);
  const errorText = errorCode ? errorTextOf(errorCode, "log") : null;
  const saved = pickParam(query.saved);
  const published = pickParam(query.published);
  const unpublished = pickParam(query.unpublished);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight">编辑日志</h1>
        <Link
          href="/admin"
          className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          ← 概览
        </Link>
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
        <span className="text-ink">{log.isPublished ? "● PUBLISHED" : "○ DRAFT"}</span>
        <span>/logs/{log.slug}</span>
        {log.isPublished && (
          <Link href={`/logs/${log.slug}`} className="border-b border-ink text-ink">
            看前台
          </Link>
        )}
      </p>

      {errorText && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          {errorCode} · {errorText}
        </p>
      )}

      {saved && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          SAVED · 已保存{log.isPublished ? "" : "，当前为草稿"}
        </p>
      )}

      {published && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          PUBLISHED · 已发布，前台可见
        </p>
      )}

      {unpublished && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          UNPUBLISHED · 已下架，前台不再可见，历史摘要与发布时间保留
        </p>
      )}

      {log.contentHash && log.publishedAt && (
        <div className="mt-6 border-t border-hairline pt-4 font-mono text-[11px] leading-relaxed text-ink-soft">
          <p>
            LAST PUBLISHED ·{" "}
            {log.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </p>
          <p className="break-all">CONTENT HASH · {log.contentHash}</p>
          {!log.isPublished && (
            <p className="mt-2">
              这份哈希对应的是上一次发布的正文；重新发布会按当前正文重算。
            </p>
          )}
        </div>
      )}

      <form action={saveLogAction} className="mt-10 grid gap-6 md:grid-cols-2">
        <input type="hidden" name="id" value={log.id} />

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            TITLE
          </span>
          <input
            name="title"
            defaultValue={log.title}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            SLUG
          </span>
          <input
            name="slug"
            defaultValue={log.slug}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            PROJECT
          </span>
          <select
            name="projectId"
            defaultValue={log.projectId}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            TAGS（逗号分隔，可空）
          </span>
          <input
            name="tags"
            defaultValue={log.tags.join(", ")}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            BEFORE DATE（本地时间，存库转 UTC）
          </span>
          <input
            type="datetime-local"
            name="beforeDate"
            defaultValue={toDateTimeLocal(log.beforeDate)}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            AFTER DATE（可空）
          </span>
          <input
            type="datetime-local"
            name="afterDate"
            defaultValue={toDateTimeLocal(log.afterDate)}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <div className="md:col-span-2">
          <Editor
            initialBefore={log.beforeContent}
            initialAfter={log.afterContent ?? ""}
          />
        </div>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            LESSON LEARNED（Markdown，可空）
          </span>
          <textarea
            name="lessonLearned"
            defaultValue={log.lessonLearned ?? ""}
            rows={4}
            className="w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
          />
        </label>

        <div className="flex flex-wrap items-baseline gap-6 md:col-span-2">
          <button
            type="submit"
            className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink"
          >
            保存修改
          </button>
          <span className="font-mono text-[10px] text-ink-soft">
            {log.isPublished
              ? "已发布的日志一保存就退回草稿，需要重新发布"
              : "草稿对外不可见"}
          </span>
        </div>
      </form>

      {!log.isPublished && (
        <form action={publishLogAction} className="mt-8 border-t border-hairline pt-6">
          <input type="hidden" name="id" value={log.id} />
          <button
            type="submit"
            className="border border-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-ink"
          >
            发布
          </button>
          <span className="ml-6 font-mono text-[10px] text-ink-soft">
            发布 = 按当前正文算 SHA-256 + 记录服务器时间，两者同时写入
          </span>
        </form>
      )}

      {log.isPublished && (
        <form
          action={unpublishLogAction}
          className="mt-8 border-t border-hairline pt-6"
        >
          <input type="hidden" name="id" value={log.id} />
          <button
            type="submit"
            className="border border-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-ink"
          >
            下架
          </button>
          <span className="ml-6 font-mono text-[10px] text-ink-soft">
            下架 = 前台立即不可见，保留历史摘要与发布时间，正文不动
          </span>
        </form>
      )}
    </>
  );
}
