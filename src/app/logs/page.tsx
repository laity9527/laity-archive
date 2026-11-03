/**
 * 文件：src/app/logs/page.tsx
 * 描述：日志大厅：项目 + 标签双层筛选，左侧 BEFORE/AFTER 时间轴列表
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表 + Suspense 包裹未缓存数据库查询）
 * - 2026-10-30: Phase 2 完整版，补齐双层筛选与时间轴
 * - 2026-11-02: pickParam 改由 src/lib/forms.ts 提供
 * - 2026-11-03: 补页面标题与描述；正文容器加 id 供导航的"跳到正文"使用
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Timeline } from "@/components/Timeline";
import { pickParam } from "@/lib/forms";
import { getSafeLogs } from "@/lib/logs";

export const metadata: Metadata = {
  title: "开发日志",
  description:
    "按项目与标签筛选的开发复盘：每条都分成 BEFORE 判断与 AFTER 验证两段，并带内容摘要存证。",
};

type LogsPageProps = {
  searchParams: Promise<{
    project?: string | string[];
    tag?: string | string[];
  }>;
};

function logsHref(params: { project?: string; tag?: string }) {
  const search = new URLSearchParams();
  if (params.project) search.set("project", params.project);
  if (params.tag) search.set("tag", params.tag);
  const query = search.toString();
  return query ? `/logs?${query}` : "/logs";
}

function filterClass(active: boolean) {
  // 未选中也留一条透明下边线，否则选中态与 hover 会让文字基线跳 1px
  return active
    ? "border-b border-ink text-ink"
    : "border-b border-transparent text-ink-soft hover:border-ink hover:text-ink";
}

async function LogBoard({ searchParams }: LogsPageProps) {
  const { project, tag } = await searchParams;
  const projectFilter = pickParam(project);
  const tagFilter = pickParam(tag);

  const all = await getSafeLogs();
  const logs =
    projectFilter || tagFilter
      ? await getSafeLogs({ project: projectFilter, tag: tagFilter })
      : all;

  const projectOptions = [
    ...new Map(all.map((log) => [log.project.slug, log.project.name])),
  ];
  const tagOptions = [...new Set(all.flatMap((log) => log.tags))];

  return (
    <>
      <nav className="mb-12 flex flex-col gap-4 border-y border-hairline py-4 md:flex-row md:items-baseline md:gap-10">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            PROJECT
          </span>
          <Link
            href={logsHref({ tag: tagFilter })}
            className={filterClass(!projectFilter)}
          >
            全部
          </Link>
          {projectOptions.map(([slug, name]) => (
            <Link
              key={slug}
              href={logsHref({
                project: projectFilter === slug ? undefined : slug,
                tag: tagFilter,
              })}
              className={filterClass(projectFilter === slug)}
            >
              {name}
            </Link>
          ))}
        </div>
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 md:ml-auto">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              TAG
            </span>
            {tagOptions.map((item) => (
              <Link
                key={item}
                href={logsHref({
                  project: projectFilter,
                  tag: tagFilter === item ? undefined : item,
                })}
                className={filterClass(tagFilter === item)}
              >
                {item}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {logs.length === 0 ? (
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-soft">
            NO LOG MATCHED
          </p>
          {(projectFilter || tagFilter) && (
            <Link
              href={logsHref({})}
              className="mt-5 inline-block border-b border-ink font-mono text-[11px] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              清除筛选，看全部日志 →
            </Link>
          )}
        </div>
      ) : (
        <ul className="border-t border-ink">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex flex-col gap-6 border-b border-hairline py-10 md:flex-row md:gap-10"
            >
              <Timeline beforeDate={log.beforeDate} afterDate={log.afterDate} />
              <article className="flex-1">
                <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
                  {log.project.name}
                </p>
                <h2 className="mt-2 text-2xl font-medium">
                  <Link
                    href={`/logs/${log.slug}`}
                    className="hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {log.title}
                  </Link>
                </h2>
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
    </>
  );
}

export default function LogsPage({ searchParams }: LogsPageProps) {
  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <h1 className="mb-12 text-4xl font-medium tracking-tight">开发日志</h1>
      <Suspense
        fallback={<p className="font-mono text-sm text-ink-soft">LOADING…</p>}
      >
        <LogBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
