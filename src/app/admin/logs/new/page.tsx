/**
 * 文件：src/app/admin/logs/new/page.tsx
 * 描述：新建日志草稿：标题/项目/标签/双时间戳/双栏编辑器，保存后进入编辑页
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import Link from "next/link";
import { saveLogAction } from "@/app/admin/log-actions";
import { Editor } from "@/components/Editor";
import { listProjects } from "@/lib/projects";
import { toDateTimeLocal } from "@/lib/publish";

export const instant = false;

type NewLogPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

const ERROR_TEXT: Record<string, string> = {
  AUTH_001: "会话已失效，请重新登录。",
  VAL_001: "参数不合法：标题必填（≤120 字）、slug 用小写字母数字连字符、BEFORE 不能为空、AFTER 不早于 BEFORE。",
  LOG_001: "slug 已被占用，换一个。",
  LOG_002: "日志不存在，可能已被删除。",
};

function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function NewLogPage({ searchParams }: NewLogPageProps) {
  const params = await searchParams;
  const errorCode = pickParam(params.error);
  const errorText = errorCode ? (ERROR_TEXT[errorCode] ?? errorCode) : null;
  const projects = await listProjects();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight">新建日志</h1>
        <Link
          href="/admin"
          className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          ← 概览
        </Link>
      </div>

      {errorText && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          {errorCode} · {errorText}
        </p>
      )}

      {projects.length === 0 ? (
        <p className="mt-10 border-t border-ink py-6 font-mono text-xs text-ink-soft">
          还没有项目，先{" "}
          <Link href="/admin/projects" className="border-b border-ink text-ink">
            建一个项目
          </Link>
          。
        </p>
      ) : (
        <form action={saveLogAction} className="mt-10 grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              TITLE
            </span>
            <input
              name="title"
              className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              SLUG
            </span>
            <input
              name="slug"
              placeholder="prebuild-index"
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              PROJECT
            </span>
            <select
              name="projectId"
              defaultValue={projects[0].id}
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
              placeholder="search, prisma"
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
              defaultValue={toDateTimeLocal(new Date())}
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
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <div className="md:col-span-2">
            <Editor initialBefore="" initialAfter="" />
          </div>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              LESSON LEARNED（Markdown，可空）
            </span>
            <textarea
              name="lessonLearned"
              rows={4}
              className="w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
            />
          </label>

          <div className="flex items-baseline gap-6 md:col-span-2">
            <button
              type="submit"
              className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink"
            >
              保存草稿
            </button>
            <span className="font-mono text-[10px] text-ink-soft">
              草稿默认不对外可见，回到编辑页再发布
            </span>
          </div>
        </form>
      )}
    </>
  );
}
