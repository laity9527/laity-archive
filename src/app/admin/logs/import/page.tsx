/**
 * 文件：src/app/admin/logs/import/page.tsx
 * 描述：导入 Markdown：读本地文件→预填标题/slug/正文→保存为草稿（不发布、不覆盖）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G10）。与「新建日志」的区别：新建是空白编辑器，
 *               导入面向“已经写好的 .md 文件”。冲突只做“跳过”，不做覆盖——
 *               覆盖是破坏性动作，先让作者在编辑页看到差异再决定
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MarkdownImportFields } from "@/components/admin/MarkdownImportFields";
import { requireAdminSession } from "@/auth";
import { errorTextOf } from "@/lib/error-text";
import { pickParam } from "@/lib/forms";
import { listProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "导入 Markdown",
  robots: { index: false, follow: false },
};

// 本页读会话与项目列表，导航进来必然阻塞。instant = false 只用于退出即时导航校验
export const instant = false;

type ImportPageProps = {
  searchParams: Promise<{ error?: string | string[]; field?: string | string[] }>;
};

export default async function ImportLogPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const errorCode = pickParam(params.error);
  const errorField = pickParam(params.field);
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs%2Fimport");
  }

  const projects = await listProjects(session.userId);
  const today = new Date().toISOString().slice(0, 10);
  const errorText =
    errorCode === "LOG_001"
      ? "slug 已存在，未导入（不会覆盖已有日志）。改一个 slug，或去编辑已有那条。"
      : errorCode
        ? errorTextOf(errorCode, "log", errorField)
        : null;

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            IMPORT MARKDOWN
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">
            导入 Markdown
          </h1>
        </div>
        <Link
          href="/admin/logs"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          ← 日志列表
        </Link>
      </header>

      <p className="mt-4 max-w-[640px] font-sans text-xs leading-relaxed text-ink-soft">
        读入一个 <code className="font-mono">.md</code> 文件：首个{" "}
        <code className="font-mono"># 标题</code> 作为标题并移出正文，英文文件名推导 slug；
        保存后进编辑页补齐标签与时间，确认无误再发布。
      </p>

      {errorText && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          {errorText}
        </p>
      )}

      {projects.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有项目，导入需要先选一个归属项目。
          <Link
            href="/admin/projects/new"
            className="ml-2 border-b border-ink text-ink"
          >
            新建项目 →
          </Link>
        </p>
      ) : (
        <MarkdownImportFields
          projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
          }))}
          today={today}
        />
      )}
    </>
  );
}
