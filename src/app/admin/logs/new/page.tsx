/**
 * 文件：src/app/admin/logs/new/page.tsx
 * 描述：新建日志草稿：标题/项目/标签/双时间戳/双栏编辑器，保存后进入编辑页
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 * - 2026-11-04: 保存按钮改用 SubmitButton：提交进行中禁用并显示"保存中…"，防连点重复写
 * - 2026-11-04: 状态横幅补 role=alert（D27）
 * - 2026-11-06: 第三批去英文——六个表单标签（TITLE/SLUG/PROJECT/TAGS/BEFORE DATE/AFTER DATE）中文化并走 font-sans；
 *               BEFORE/AFTER 术语保留；placeholder 的示例值（prebuild-index / search, prisma）是格式样例，不译
 * - 2026-11-06: 第二批去英文（按负责人"全局搜索 LESSON LEARNED 并一并中文化"的指令扩到本页）：
 *               表单标签 LESSON LEARNED 改「经验总结」并走 font-sans；BEFORE/AFTER 术语与 name="lessonLearned" 字段名未动
 * - 2026-11-09: V2.0 Step 4-B：项目下拉只列本租户的项目（listProjects 带 session.userId），
 *               自查会话后再查库（布局检查不阻塞页面并行渲染）
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveLogAction } from "@/app/admin/log-actions";
import { requireAdminSession } from "@/auth";
import { Editor } from "@/components/Editor";
import { SubmitButton } from "@/components/SubmitButton";
import { errorTextOf } from "@/lib/error-text";
import { LIMITS, SLUG_SOURCE, pickParam } from "@/lib/forms";
import { listProjects } from "@/lib/projects";
import { toDateTimeLocal } from "@/lib/publish";

// 本页查库并取表单默认值，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type NewLogPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    field?: string | string[];
  }>;
};

export default async function NewLogPage({ searchParams }: NewLogPageProps) {
  const params = await searchParams;
  const errorCode = pickParam(params.error);
  const errorField = pickParam(params.field);
  const errorText = errorCode ? errorTextOf(errorCode, "log", errorField) : null;
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs%2Fnew");
  }

  const projects = await listProjects(session.userId);
  const bad = (field: string) => errorCode === "VAL_001" && errorField === field;

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
        <p
          id="form-error"
          role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink"
        >
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
            <span className="font-sans text-[10px] text-ink-soft">标题</span>
            <input
              name="title"
              required
              maxLength={LIMITS.title}
              aria-invalid={bad("title") || undefined}
              aria-describedby={bad("title") ? "form-error" : undefined}
              className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-sans text-[10px] text-ink-soft">标识</span>
            <input
              name="slug"
              placeholder="prebuild-index"
              required
              pattern={SLUG_SOURCE}
              aria-invalid={bad("slug") || undefined}
              aria-describedby={bad("slug") ? "form-error" : undefined}
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-sans text-[10px] text-ink-soft">项目</span>
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
            <span className="font-sans text-[10px] text-ink-soft">{
              `标签（逗号分隔，最多 ${LIMITS.tags} 个，可空）`
            }</span>
            <input
              name="tags"
              placeholder="search, prisma"
              aria-invalid={bad("tags") || undefined}
              aria-describedby={bad("tags") ? "form-error" : undefined}
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-sans text-[10px] text-ink-soft">BEFORE 日期（本地时间，存库转 UTC）</span>
            <input
              type="datetime-local"
              name="beforeDate"
              required
              defaultValue={toDateTimeLocal(new Date())}
              aria-invalid={bad("beforeDate") || undefined}
              aria-describedby={bad("beforeDate") ? "form-error" : undefined}
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-sans text-[10px] text-ink-soft">AFTER 日期（可空）</span>
            <input
              type="datetime-local"
              name="afterDate"
              aria-invalid={bad("afterDate") || undefined}
              aria-describedby={bad("afterDate") ? "form-error" : undefined}
              className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
            />
          </label>

          <div className="md:col-span-2">
            <Editor
              initialBefore=""
              initialAfter=""
              draftKey="new"
              restoreDraft={Boolean(errorCode)}
            />
          </div>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-sans text-[10px] text-ink-soft">
              经验总结（Markdown，可空）
            </span>
            <textarea
              name="lessonLearned"
              maxLength={LIMITS.lesson}
              aria-invalid={bad("lessonLearned") || undefined}
              aria-describedby={bad("lessonLearned") ? "form-error" : undefined}
              rows={4}
              className="w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
            />
          </label>

          <div className="flex items-baseline gap-6 md:col-span-2">
            <SubmitButton
              label="保存草稿"
              pendingLabel="保存中…"
              className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink disabled:text-ink-soft"
            />
            <span className="font-mono text-[10px] text-ink-soft">
              草稿默认不对外可见，回到编辑页再发布
            </span>
          </div>
        </form>
      )}
    </>
  );
}

