/**
 * 文件：src/app/archive/page.tsx
 * 描述：档案索引大厅（Phase 4 落地）：馆藏总览条、精选项目、档案状态、最新日志、按主题、
 *       按年月回看——四块看板视图自 Phase 3 首页改版迁入，数据函数与组件零逻辑重写
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。大厅解决"筛"，归档解决"按时间回看"：
 *               年份一个区块、月份一个小标题，条目行只到标题粒度；分组与排序口径在 getArchive 单源
 * - 2026-11-16: 评审 G5：条目 >30 时年份下方加年份跳转条（阈值与判据在 archive.ts，默认不显示）
 * - 2026-11-19: V5 Phase 4 任务 3（负责人确认方案 A）：档案索引大厅落地——Phase 3 首页改版移出的
 *               四块视图（馆藏条/精选项目/档案状态/最新日志/按主题）原样迁入本页，复用
 *               getArchiveBoard/pickFeatured/getLatestLogs/getTopicCounts 与 StatusBoard/Timeline，
 *               业务逻辑一行未重写；按年月回看保留同页（新增 SectionHead 05）。
 *               版心放宽到 1200px（看板双栏容器查询的原始设计宽度）；本页查询 4 次
 *               （board/latest/topics/archive），经负责人确认预算按 4 次记录
 */
import type { Metadata } from "next";
import Link from "next/link";
import { LoadingRows } from "@/components/LoadingRows";
import { SectionHead } from "@/components/SectionHead";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { shouldShowYearBar } from "@/lib/archive";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getArchive, getLatestLogs, getTopicCounts } from "@/lib/logs";
import { getArchiveBoard, pickFeatured } from "@/lib/projects";
import { publicProjectHref } from "@/lib/routes";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "归档",
  description:
    "档案索引大厅：项目精选、档案状态、最新日志与主题分组，按年月回看全部已发布日志，每一条都记着判断时间与发布时间。",
};

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验，不改变渲染方式
export const instant = false;

// 右侧入口的统一写法：12px、透明下划线，hover 才落墨
const actionClass =
  "border-b border-transparent text-xs text-ink hover:border-ink";

// 索引大厅主体：Phase 3 从首页移出的四块视图，数据逻辑原样保留（一行业务逻辑未重写）
async function ArchiveHall() {
  const [board, latestLogs, topics] = await Promise.all([
    getArchiveBoard(),
    getLatestLogs(3),
    getTopicCounts(),
  ]);

  // 精选规则已单源化到 pickFeatured（日志数优先、同数按最近更新，无数据库字段）：
  // 零日志项目只进下面的状态看板，不进精选。与租户主页同一实现，不靠两处注释对齐
  const featured = pickFeatured(board);
  const publishedCount = board.reduce((sum, project) => sum + project.count, 0);
  const latest = latestLogs[0]?.publishedAt ?? latestLogs[0]?.beforeDate ?? null;

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-hairline pb-4 text-xs text-ink-soft">
        <span>
          <span className="font-mono text-lg text-ink">{board.length}</span> 个项目
        </span>
        <span>
          <span className="font-mono text-lg text-ink">{publishedCount}</span>{" "}
          条已发布
        </span>
        <span>
          最近更新{" "}
          <span className="font-mono text-ink">
            {latest ? latest.toISOString().slice(0, 10) : "尚未发布"}
          </span>
        </span>
        <a
          href="/feed.xml"
          className="ml-auto hidden border-b border-transparent text-xs text-ink-soft hover:border-ink hover:text-ink sm:inline"
        >
          RSS 订阅 →
        </a>
      </div>

      <section
        className={
          featured.length >= 2
            ? "mt-16 lg:flex lg:items-start lg:justify-between lg:gap-12"
            : "mt-16"
        }
      >
        {featured.length > 0 && (
          <div className={featured.length >= 2 ? "lg:w-1/2" : ""}>
            <SectionHead
              index="01"
              title="精选项目"
              action={
                <Link href="/projects" className={actionClass}>
                  全部作品 →
                </Link>
              }
            />
            <ul>
              {featured.map((project, index) => (
                <li
                  key={project.slug}
                  className="flex gap-6 border-b border-hairline py-6"
                >
                  <span
                    aria-hidden
                    className="pt-1 font-mono text-[10px] text-ink-soft"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                      <Link
                        href={publicProjectHref(project.handle, project.slug)}
                        className="text-xl hover:underline hover:decoration-1 hover:underline-offset-4"
                      >
                        {project.name}
                      </Link>
                      <span className="font-sans text-xs text-ink-soft">
                        {kindLabel(project.kind)} · {statusLabel(project.status)}{" "}
                        · {logsCountLabel(project.count)}
                      </span>
                    </div>
                    {project.summary && (
                      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
                        {project.summary}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={`@container ${
            featured.length >= 2
              ? "mt-16 lg:mt-0 lg:w-1/2 lg:border-l lg:border-hairline lg:pl-12"
              : "mt-16 lg:grid lg:grid-cols-2 lg:gap-12"
          }`}
        >
          <section>
            <SectionHead index="02" title="档案状态" />
            <div className="mt-4">
              <StatusBoard entries={board} />
            </div>
          </section>

          <section className={featured.length >= 2 ? "mt-16" : "mt-16 lg:mt-0"}>
            <SectionHead
              index="03"
              title="最新日志"
              action={
                <Link href="/logs" className={actionClass}>
                  全部日志 →
                </Link>
              }
            />
            {latestLogs.length === 0 ? (
              <p className="py-6 font-sans text-sm text-ink-soft">
                暂无已发布日志
              </p>
            ) : (
              <ul>
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
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                          {log.lessonLearned}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono text-xs text-ink-soft">
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
      </section>

      <section className="mt-16">
        <SectionHead
          index="04"
          title="按主题"
          action={
            <Link href="/logs" className={actionClass}>
              全部日志 →
            </Link>
          }
        />
        <ul className="mt-4 grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          {topics
            .filter((topic) => topic.count > 0)
            .map((topic) => (
              <li key={topic.key} className="border-b border-hairline">
                <Link
                  href={`/logs?topic=${topic.key}`}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                >
                  <span>{topic.label}</span>
                  <span className="font-mono text-[10px] text-ink-soft">
                    {topic.count}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}

// 按年月回看：本页原有职责（V3/B4），分组与排序口径在 getArchive 单源
async function ArchiveByMonth() {
  const years = await getArchive();
  const total = years.reduce((sum, year) => sum + year.count, 0);
  const projectNames = new Set(
    years.flatMap((year) =>
      year.months.flatMap((month) => month.items.map((item) => item.projectName)),
    ),
  );
  const singleProject = projectNames.size === 1;

  return (
    <section className="mt-16">
      <SectionHead index="05" title="按年月回看" />
      {years.length === 0 ? (
        <p className="mt-4 border-t border-ink py-6 font-sans text-sm text-ink-soft">
          还没有已发布日志
        </p>
      ) : (
        <div className="mt-4 space-y-16">
          {shouldShowYearBar(total) && (
            <nav
              aria-label="按年份跳转"
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-hairline py-3"
            >
              <span className="font-mono text-[10px] tracking-[0.16em] text-ink-soft">
                YEAR
              </span>
              {years.map((year) => (
                <a
                  key={year.year}
                  href={`#${year.year}`}
                  className="border-b border-transparent font-mono text-xs text-ink-soft hover:border-ink hover:text-ink"
                >
                  {year.year}{" "}
                  <span className="text-xs text-ink-soft">{year.count}</span>
                </a>
              ))}
            </nav>
          )}
          {years.map((year) => (
            <section key={year.year} id={year.year} className="scroll-mt-8">
              <div className="flex items-baseline justify-between border-b border-ink pb-2">
                <h2 className="font-mono text-2xl tracking-[0.08em] text-ink">
                  {year.year}
                </h2>
                <span className="font-mono text-xs text-ink-soft">
                  {year.count} 条
                </span>
              </div>

              {year.months.map((month) => (
                <div key={month.key} className="mt-8">
                  <p className="font-mono text-xs tracking-[0.16em] text-ink-soft">
                    {month.key}
                  </p>
                  <ul className="mt-3 border-t border-hairline">
                    {month.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-3"
                      >
                        <span className="font-mono text-xs text-ink-soft">
                          {item.beforeDate.toISOString().slice(0, 10)}
                        </span>
                        <Link
                          href={`/u/${item.handle}/logs/${item.slug}`}
                          className="text-base hover:underline hover:decoration-1 hover:underline-offset-4"
                        >
                          {item.title}
                        </Link>
                        {!singleProject && (
                          <span className="ml-auto font-sans text-xs text-ink-soft">
                            {item.projectName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <p className="mt-16 flex flex-wrap gap-6">
        <Link
          href="/logs"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          全部日志 →
        </Link>
        <Link
          href="/tags"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          按标签看 →
        </Link>
      </p>
    </section>
  );
}

export default function ArchivePage() {
  return (
    <main id="main" className="mx-auto max-w-[1200px] px-6 py-16 max-md:py-10">
      <Suspense fallback={<LoadingRows rows={3} />}>
        <ArchiveHall />
      </Suspense>
      <Suspense fallback={<LoadingRows rows={3} />}>
        <ArchiveByMonth />
      </Suspense>
    </main>
  );
}
