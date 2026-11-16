/**
 * 文件：src/app/page.tsx
 * 描述：首页：标语、馆藏条、精选项目、档案状态、最新日志、按主题（重构 B0）
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
 * - 2026-11-13: 显著升级 A：标语下加馆藏条（项目数 / 已发布数 / 最近更新，复用同一次 board+latest 取数，
 *               零新增查询）；精选行加 mono 索引 01–03；两处「全部」入口统一 12px；项目链接改走
 *               publicProjectHref()（原先手拼，与看板同一处 404 根因）；版心首页放宽到 1200px
 * - 2026-11-13: 显著升级 B4：Suspense fallback 由「加载中…」文本改为暖线骨架（LoadingRows）
 * - 2026-11-13: 首页主题入口：新增「按主题」区块（8 个主题 + 计数），计数来自 getTopicCounts
 *               的单列 tags 查询；首页自此为 3 次查询，仍在 O8 预算内
 * - 2026-11-13: 本轮升级：精选口径改调 pickFeatured（与租户主页同一实现），删掉页内重复的排序规则
 * - 2026-11-16: 重构 B0：Hero 重排（display 字号 + ink 收边线）、四个区块统一走 SectionHead（编号 + 中文标签 + 右侧入口），
 *               间距按十档收紧（Hero 后 48 / 区块之间 64/96），馆藏条改 hairline 收边。数据逻辑一字未动
 */
import Link from "next/link";
import { Suspense } from "react";
import { LoadingRows } from "@/components/LoadingRows";
import { SectionHead } from "@/components/SectionHead";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getLatestLogs, getTopicCounts } from "@/lib/logs";
import { getArchiveBoard, pickFeatured } from "@/lib/projects";
import { publicProjectHref } from "@/lib/routes";

// 右侧入口的统一写法：12px、透明下划线，hover 才落墨
const actionClass =
  "border-b border-transparent text-xs text-ink hover:border-ink";

// 首页版心 1200px（与导航、页脚同宽）；Hero 用 clamp(2.5rem,5.2vw,3.5rem)，375–1440 不折行
async function ArchiveOverview() {
  // 首页的最新日志只要 3 条，按发布时间交给数据库取（D13 修订），不再全表捞回内存再切
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
            ? "mt-16 md:flex md:items-start md:justify-between md:gap-12"
            : "mt-16"
        }
      >
        {featured.length > 0 && (
          <div className={featured.length >= 2 ? "md:w-2/3" : ""}>
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
              ? "mt-16 md:mt-0 md:w-1/3 md:border-l md:border-hairline md:pl-12"
              : "mt-16 md:grid md:grid-cols-2 md:gap-12"
          }`}
        >
          <section>
            <SectionHead index="02" title="档案状态" />
            <div className="mt-4">
              <StatusBoard entries={board} />
            </div>
          </section>

          <section className={featured.length >= 2 ? "mt-16" : "mt-16 md:mt-0"}>
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
      </section>

      <section className="mt-24">
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

export default function Home() {
  return (
    <main id="main" className="mx-auto max-w-[1200px] px-6 py-24">
      <header className="border-b border-ink pb-12">
        <h1 className="text-balance text-[clamp(2.5rem,5.2vw,3.5rem)] font-medium leading-[1.08] tracking-tight">
          数字档案，记录每一次工程决策。
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          收集项目作品与开发复盘，构建一份可信的数字履历。
        </p>
      </header>

      <div className="mt-12">
        <Suspense fallback={<LoadingRows rows={3} />}>
          <ArchiveOverview />
        </Suspense>
      </div>
    </main>
  );
}
