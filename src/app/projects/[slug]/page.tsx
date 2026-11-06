/**
 * 文件：src/app/projects/[slug]/page.tsx
 * 描述：项目详情：项目基本信息与仓库外链，下面是该项目全部已发布日志的时间轴列表
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5a 初始创建；不存在的 slug 走 notFound，日志仅取已发布
 * - 2026-10-30: 更正说明：页面级 notFound 换不了状态码，真 404 由 src/proxy.ts 前置判定（与详情页同一路数）
 * - 2026-11-02: 补 instant 注释说明（false 是退出即时导航校验，不改变渲染方式）
 * - 2026-11-03: 按项目名生成页面标题与描述；正文容器加 id 供"跳到正文"使用
 * - 2026-11-06: 全站去英文第一批——kind/status 与 LOGS 改走 src/lib/labels.ts 映射（含 generateMetadata 的描述串）、
 *               空态 NO LOG YET 改「该项目暂无已发布日志」；slug 与日期留 font-mono，中文走 font-sans。
 *               同页的 SINCE / REPO / LOGS 三个纯英文标签按分工留在第二批，本轮未动
 * - 2026-11-06: 第四批（负责人裁断一）——SINCE 改「始于」、REPO ↗ 改「仓库 ↗」、区块标题 LOGS 改「开发日志」，
 *               三处标签走 font-sans；日期仍留 font-mono，且「始于 」与日期同处一个 span，避免 flex 的 gap-x-6 在两段间撑出 24px
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getSafeLogs } from "@/lib/logs";
import { getPublicProjectBySlug } from "@/lib/projects";

// 详情页标题跟着项目名走；项目不存在时给中性标题，页面本身会走 404
export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);

  if (!project) {
    return { title: "项目不存在" };
  }

  return {
    title: project.name,
    description:
      project.summary?.trim() ||
      `${project.name}（${kindLabel(project.kind)} · ${statusLabel(project.status)}）的作品档案：判断与验证过程按时间轴归档。`,
  };
}

// 本页按 slug 查项目与其已发布日志，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
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
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <Link
        href="/projects"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 项目
      </Link>

      <header className="mt-8 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
          {project.slug}
          <span className="font-sans">{` · ${kindLabel(project.kind)} · ${statusLabel(project.status)}`}</span>
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
          <span><span className="font-sans">{`始于 `}</span>{project.createdAt.toISOString().slice(0, 10)}</span>
          <span className="font-sans">{logsCountLabel(logs.length)}</span>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="font-sans text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              仓库 ↗
            </a>
          )}
        </p>
      </header>

      <section className="mt-12">
        <h2 className="mb-4 font-sans text-[10px] text-ink-soft">开发日志</h2>
        {logs.length === 0 ? (
          <p className="border-t border-ink py-6 font-sans text-xs text-ink-soft">
            该项目暂无已发布日志
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
