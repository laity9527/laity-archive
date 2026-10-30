/**
 * 文件：src/app/projects/page.tsx
 * 描述：作品维度入口：列出全部项目，含类型、状态、简介与已发布日志数（草稿不计数）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5a 初始创建
 */
import Link from "next/link";
import { listPublicProjects } from "@/lib/projects";

// 未缓存查询需要整段阻塞渲染，与详情页同一处理方式
export const instant = false;

export default async function ProjectsPage() {
  const projects = await listPublicProjects();

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 首页
      </Link>
      <h1 className="mt-8 text-4xl font-medium tracking-tight">项目</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        按作品维度看档案：一个项目下的判断与验证，都收在同一页里。
      </p>

      {projects.length === 0 ? (
        <p className="mt-12 border-t border-ink py-6 font-mono text-xs text-ink-soft">
          NO PROJECT YET
        </p>
      ) : (
        <ul className="mt-12 border-t border-ink">
          {projects.map((project) => (
            <li
              key={project.slug}
              className="flex flex-col gap-4 border-b border-hairline py-8 md:flex-row md:items-baseline md:gap-8"
            >
              <span aria-hidden className="font-mono text-[10px] text-ink">
                {project.status === "LIVE" ? "●" : "○"}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-medium">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {project.name}
                  </Link>
                </h2>
                <p className="mt-2 font-mono text-[11px] tracking-[0.1em] text-ink-soft">
                  {project.slug} · {project.kind.toUpperCase()} ·{" "}
                  {project.status}
                </p>
                {project.summary && (
                  <p className="mt-3 max-w-xl text-sm text-ink-soft">
                    {project.summary}
                  </p>
                )}
              </div>
              <p className="font-mono text-[11px] text-ink-soft md:text-right">
                {project.logs.length} LOGS
                {project.logs.length > 0 &&
                  ` · ${project.logs[0].beforeDate.toISOString().slice(0, 10)}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-16">
        <Link href="/logs" className="border-b border-ink text-sm">
          全部日志 →
        </Link>
      </p>
    </main>
  );
}
