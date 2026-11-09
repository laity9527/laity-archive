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
 * - 2026-11-06: 首屏文案按负责人要求改为「数字档案，记录每一次工程决策。」+「收集项目作品与开发复盘，构建一份可信的数字履历。」；字号阶与颜色（h1 36px 主墨、副标 18px 辅助灰）未动，故 D30 A4 那组层间区分度样本仍成立
 * - 2026-11-06: 任务 2 桌面端两栏——外层 `md:flex md:items-start md:justify-between`，精选项目占 `md:w-2/3` 并以 `md:border-r md:border-hairline md:pr-12` 收边，
 *               右栏 `md:w-1/3 md:pl-12` 垂直堆叠档案状态与最新日志；原来挂在档案状态 section 上的 `mt-20` 移到右栏外层并加 `md:mt-0`。
 *               移动端不加任何 md: 前缀的类即回落为原有单列流式；零圆角、零阴影、分隔只用 1px `--color-hairline`
 * - 2026-11-06: 右栏改容器查询（负责人裁断一，A 方案）——右栏外层加 `@container`，日志行的横排条件由 `md:flex-row md:gap-10`
 *               改为 `@[36rem]:flex-row @[36rem]:gap-10`。起因是实测：`md:` 判的是视口宽度不是栏宽，1280 视口下 344px 的右栏里
 *               200px 时间轴 + 40px gap 只给标题剩 56px，20px 标题折成 13 行 364px 高。容器查询按栏宽决定横竖排，
 *               BEFORE/AFTER 双段时间轴的表达保留（栏够宽仍横排），不是把时间轴删掉
 * - 2026-11-06: 「最新日志」口径修正——取数由 `getSafeLogs({ take: 3 })`（按 beforeDate 排）改为 `getLatestLogs(3)`（按 publishedAt 排，
 *               同秒并列时以 beforeDate 兜底）；原 `logs.slice(0, 3)` 随之外提为查询的 take，渲染部分未改动
 * - 2026-11-06: 「最新日志」每条标题下增两行摘要——取 lessonLearned（实测 12 条已发布日志的经验总结均非空、65–109 字、且 0 条含 Markdown 语法，故直接原文渲染不写剥离器；对照：beforeContent 有 11/12 条含 # 或反引号，直接截断会把语法漏到前台）。行数以 CSS `line-clamp-2` 截两行为准；lessonLearned 在 schema 里可空，为空时整段不渲染，不留空行
 * - 2026-11-09: V2.0 Step 3 阶段一：精选项目与最新日志的跳转链接改 /u/[handle]/... 体系——
 *               看板条目带出 user.handle（getArchiveBoard 的 select 白名单）、日志行带出 log.user.handle（getLatestLogs 同）；
 *               首页仍展示全站精选（裁定 ①：大厅与首页为全局聚合视图，租户视图在 /u/[handle]）
 */
import Link from "next/link";
import { Suspense } from "react";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getLatestLogs } from "@/lib/logs";
import { getArchiveBoard } from "@/lib/projects";

async function ArchiveOverview() {
  // 首页的最新日志只要 3 条，按发布时间交给数据库取（D13 修订），不再全表捞回内存再切
  const [board, latestLogs] = await Promise.all([
    getArchiveBoard(),
    getLatestLogs(3),
  ]);

  // 精选规则（本轮定的，无数据库字段）：有已发布日志的项目按最近更新取前 3；
  // 零日志项目只进下面的状态看板，不进精选
  const featured = board.filter((project) => project.count > 0).slice(0, 3);

  return (
    <div className="md:flex md:items-start md:justify-between">
      {featured.length > 0 && (
        <section className="md:w-2/3 md:border-r md:border-hairline md:pr-12">
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
                    href={`/u/${project.handle}/projects/${project.slug}`}
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

      <div className={`@container ${featured.length > 0 ? "mt-20 md:mt-0 md:w-1/3 md:pl-12" : "md:w-full"}`}>
        <section>
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
                  className="flex flex-col gap-6 border-b border-hairline py-8 @[36rem]:flex-row @[36rem]:gap-10"
                >
                  <Timeline
                    beforeDate={log.beforeDate}
                    afterDate={log.afterDate}
                  />
                  <article className="flex-1">
                    <h3 className="text-xl font-medium">
                      <Link
                        href={`/u/${log.user.handle}/logs/${log.slug}`}
                        className="hover:underline hover:decoration-1 hover:underline-offset-4"
                      >
                        {log.title}
                      </Link>
                    </h3>
                    {log.lessonLearned ? (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                        {log.lessonLearned}
                      </p>
                    ) : null}
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
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          数字档案，记录每一次工程决策。
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          收集项目作品与开发复盘，构建一份可信的数字履历。
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
