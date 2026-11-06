/**
 * 文件：src/app/page.tsx
 * 描述：首页：标语、档案状态看板、最新已发布日志
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建占位版
 * - 2026-10-30: Phase 2 完整版，看板与最新日志均读真库（未缓存查询由 Suspense 包裹）
 * - 2026-11-02: 看板改由 getArchiveBoard 供数（零日志项目也上榜），新增精选区与 /projects 入口（I029/I030，经批准补做）
 * - 2026-11-05: 三个区头与精选行的枚举标签中文化，枚举翻译改走 src/lib/labels.ts 单源；中文标签去 font-mono 与 0.2em 字距
 * - 2026-11-06: 空态 NO LOG YET 与 Suspense fallback 的 LOADING… 中文化（暂无已发布日志 / 加载中…），同批去掉中文行的 font-mono 与宽字距
 */
import Link from "next/link";
import { Suspense } from "react";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getSafeLogs } from "@/lib/logs";
import { getArchiveBoard } from "@/lib/projects";

async function ArchiveOverview() {
  // 首页的最新日志只要 3 条，取数交给数据库的 take，不再全表捞回内存
  const [board, logs] = await Promise.all([
    getArchiveBoard(),
    getSafeLogs({ take: 3 }),
  ]);

  // 精选规则（本轮定的，无数据库字段）：有已发布日志的项目按最近更新取前 3；
  // 零日志项目只进下面的状态看板，不进精选
  const featured = board.filter((project) => project.count > 0).slice(0, 3);
  const latestLogs = logs.slice(0, 3);

  return (
    <>
      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-sans text-[10px] text-ink-soft">精选项目</h2>
            <Link
              href="/projects"
              className="border-b border-ink font-mono text-[11px] hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              全部作品 →
            </Link>
          </div>
          <ul className="border-t border-ink">
            {featured.map((project) => (
              <li key={project.slug} className="border-b border-hairline py-6">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="text-lg hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {project.name}
                  </Link>
                  <span className="font-sans text-[11px] text-ink-soft">
                    {kindLabel(project.kind)} · {statusLabel(project.status)} ·{" "}
                    {logsCountLabel(project.count)}
                  </span>
                </div>
                {project.summary && (
                  <p className="mt-2 max-w-prose text-sm text-ink-soft">
                    {project.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={featured.length > 0 ? "mt-20" : ""}>
        <h2 className="mb-4 font-sans text-[10px] text-ink-soft">档案状态</h2>
        <StatusBoard entries={board} />
      </section>

      <section className="mt-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-sans text-[10px] text-ink-soft">最新日志</h2>
          <Link href="/logs" className="border-b border-ink text-sm">
            全部日志 →
          </Link>
        </div>
        {latestLogs.length === 0 ? (
          <p className="border-t border-ink py-6 font-sans text-xs text-ink-soft">
            暂无已发布日志
          </p>
        ) : (
          <ul className="border-t border-ink">
            {latestLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-6 border-b border-hairline py-8 md:flex-row md:gap-10"
              >
                <Timeline
                  beforeDate={log.beforeDate}
                  afterDate={log.afterDate}
                />
                <article className="flex-1">
                  <h3 className="text-xl font-medium">
                    <Link
                      href={`/logs/${log.slug}`}
                      className="hover:underline hover:decoration-1 hover:underline-offset-4"
                    >
                      {log.title}
                    </Link>
                  </h3>
                  <p className="mt-2 font-mono text-[11px] text-ink-soft">
                    {log.project.name}
                    {log.tags.length > 0 ? ` · ${log.tags.join(" · ")}` : ""}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Home() {
  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          不囤想法，直接上线。
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          用 AI 与代码把想法直接变成上线产品。记录每一次判断与踩坑。
        </p>
      </header>

      <div className="mt-20">
        <Suspense
          fallback={<p className="font-sans text-sm text-ink-soft">加载中…</p>}
        >
          <ArchiveOverview />
        </Suspense>
      </div>
    </main>
  );
}
