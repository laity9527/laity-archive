/**
 * 文件：src/app/page.tsx
 * 描述：首页：标语、档案状态看板、最新已发布日志
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建占位版
 * - 2026-10-30: Phase 2 完整版，看板与最新日志均读真库（未缓存查询由 Suspense 包裹）
 */
import Link from "next/link";
import { Suspense } from "react";
import { StatusBoard, type StatusBoardEntry } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { getSafeLogs } from "@/lib/logs";

async function ArchiveOverview() {
  const logs = await getSafeLogs();

  const byProject = new Map<string, StatusBoardEntry>();
  for (const log of logs) {
    const entry = byProject.get(log.project.slug);
    if (entry) {
      entry.count += 1;
      if (log.beforeDate > entry.latest) {
        entry.latest = log.beforeDate;
      }
    } else {
      byProject.set(log.project.slug, {
        name: log.project.name,
        slug: log.project.slug,
        kind: log.project.kind,
        status: log.project.status,
        count: 1,
        latest: log.beforeDate,
      });
    }
  }

  const entries = [...byProject.values()].sort(
    (a, b) => b.latest.getTime() - a.latest.getTime(),
  );
  const latestLogs = logs.slice(0, 3);

  return (
    <>
      <section>
        <h2 className="mb-4 font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          ARCHIVE STATUS
        </h2>
        <StatusBoard entries={entries} />
      </section>

      <section className="mt-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            LATEST LOGS
          </h2>
          <Link href="/logs" className="border-b border-ink text-sm">
            全部日志 →
          </Link>
        </div>
        {latestLogs.length === 0 ? (
          <p className="border-t border-ink py-6 font-mono text-xs text-ink-soft">
            NO LOG YET
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
    <main className="mx-auto max-w-[1080px] px-6 py-24">
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
          fallback={
            <p className="font-mono text-sm text-ink-soft">LOADING…</p>
          }
        >
          <ArchiveOverview />
        </Suspense>
      </div>
    </main>
  );
}
