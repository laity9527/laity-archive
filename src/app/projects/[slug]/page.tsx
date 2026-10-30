/**
 * 文件：src/app/projects/[slug]/page.tsx
 * 描述：项目详情：项目基本信息与仓库外链，下面是该项目全部已发布日志的时间轴列表
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5a 初始创建；不存在的 slug 走 notFound，日志仅取已发布
 * - 2026-10-30: 更正说明：页面级 notFound 换不了状态码，真 404 由 src/proxy.ts 前置判定（与详情页同一路数）
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/Timeline";
import { getSafeLogs } from "@/lib/logs";
import { getPublicProjectBySlug } from "@/lib/projects";

export const instant = false;

export default async function ProjectDetailPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const logs = await getSafeLogs({ project: slug });

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-24">
      <Link
        href="/projects"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 项目
      </Link>

      <header className="mt-8 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
          {project.slug} · {project.kind.toUpperCase()} · {project.status}
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">
          {project.name}
        </h1>
        {project.summary && (
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            {project.summary}
          </p>
        )}
        <p className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-[11px] text-ink-soft">
          <span>SINCE {project.createdAt.toISOString().slice(0, 10)}</span>
          <span>{logs.length} LOGS</span>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              REPO ↗
            </a>
          )}
        </p>
      </header>

      <section className="mt-12">
        <h2 className="mb-4 font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          LOGS
        </h2>
        {logs.length === 0 ? (
          <p className="border-t border-ink py-6 font-mono text-xs text-ink-soft">
            NO LOG YET
          </p>
        ) : (
          <ul className="border-t border-ink">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-6 border-b border-hairline py-10 md:flex-row md:gap-10"
              >
                <Timeline beforeDate={log.beforeDate} afterDate={log.afterDate} />
                <article className="flex-1">
                  <h3 className="text-2xl font-medium">
                    <Link
                      href={`/logs/${log.slug}`}
                      className="hover:underline hover:decoration-1 hover:underline-offset-4"
                    >
                      {log.title}
                    </Link>
                  </h3>
                  {log.tags.length > 0 && (
                    <p className="mt-3 font-mono text-[11px] text-ink-soft">
                      {log.tags.join(" · ")}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-16">
        <Link
          href={`/logs?project=${encodeURIComponent(project.slug)}`}
          className="border-b border-ink text-sm"
        >
          在日志大厅筛选该项目 →
        </Link>
      </p>
    </main>
  );
}
