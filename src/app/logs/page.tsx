/**
 * 文件：src/app/logs/page.tsx
 * 描述：日志大厅：项目 + 主题 + 标签三层筛选，左侧固定筛选栏，右侧结果与激活筛选摘要
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表 + Suspense 包裹未缓存数据库查询）
 * - 2026-10-30: Phase 2 完整版，补齐双层筛选与时间轴
 * - 2026-11-02: pickParam 改由 src/lib/forms.ts 提供
 * - 2026-11-03: 补页面标题与描述；正文容器加 id 供导航的"跳到正文"使用
 * - 2026-11-03: 描述改为"附 SHA-256 摘要与发布时间，可核对是否被改动"，去掉"存证"口吻
 * - 2026-11-05: 两层筛选的维度名 PROJECT/TAG 改为「项目」「标签」并去 font-mono 与 0.2em 字距；标签值属库里的用户数据，本轮不翻译（筛选参数与 tags: { has } 判定均未动）
 * - 2026-11-06: 空态 NO LOG MATCHED 与 Suspense fallback 的 LOADING… 中文化（没有符合条件的日志 / 加载中…），同批去掉中文行的 font-mono 与宽字距
 * - 2026-11-06: 列表 `<ul>` 加 `@container`，为 Timeline 的容器查询宽度提供承载元素（本页列表满宽 ≥576px，时间轴仍是左侧 200px，视觉与改前一致）
 * - 2026-11-06: 标签筛选区折叠——注入 11 篇日志后标签累积到 52 个，全量渲染堆成六七行文字墙。默认可见只留 `TAG_LIMIT = 12` 个，
 *               其余收进原生 `<details>`/`<summary>`（零客户端组件、零新依赖）；`display: contents` 让 summary 与折叠标签仍是同一行 flex 子项，
 *               三角标记用 `list-none` + `[&::-webkit-details-marker]:hidden` 隐藏；当前选中的标签若落在折叠区则并进可见组，避免筛选态不可见
 * - 2026-11-06: 修正上一条的 `display: contents` 方案——Chrome 把 details 里非 summary 的内容收进 `::details-content` 伪盒，那 40 个标签因此不是外层 flex 容器的子项，`gap-x-4 gap-y-2` 对它们完全失效，退化成首尾相接的 inline 文字流（负责人截图里展开后粘连的成因）。
 *               现改为 details 自占一行（`basis-full`）、折叠内容由独立的 `flex flex-wrap gap-x-4 gap-y-3` div 承载；两组筛选区的行间距同步由 `gap-y-2` 提到 `gap-y-3`，
 *               summary 加 `w-fit` 把命中区收窄到文案本身
 * - 2026-11-09: V2.0 Step 3 阶段一：大厅仍是全局公共大厅（裁定 ①），列表行标题链接改
 *               /u/[handle]/logs/[slug]——owner 的 handle 经 getSafeLogs 的 include 白名单带出（公开标识）
 * - 2026-11-11: V2.1 新增全局搜索：筛选栏上方搜索表单（GET 提交 + hidden input 携带
 *               project/tag，提交不丢筛选）；logsHref 全链路保留 q；空态三态
 *               （搜索无结果/筛选无结果/全空）
 * - 2026-11-12: F24 搜索关键词高亮接线：标题按 highlightSegments 切段包 <mark>；
 *               命中字段新增 BEFORE/AFTER 片段行（extractSnippet 半径 60，纯文本预览不经
 *               Markdown 渲染器）；q 为空时列表行为不变
 * - 2026-11-12: F26 标签聚合：列表行标签改 Link 指向 /tags/[tag]；筛选区 tagChip 与 details
 *               一字不动（筛选是 F03 点名交互，改成跳转会破坏功能）
 * - 2026-11-13: O1/O2 页面接入：列表改游标分页（50 条/页）、筛选项改 getLogFacets、
 *               搜索改限量 50 条候选池（searchLogsLimited）+ 当前页二次取正文算片段
 * - 2026-11-13: 显著升级 A：版心 1080 → 1200，与导航 / 首页同步；筛选与搜索逻辑未动
 * - 2026-11-13: 显著升级 B1：横排筛选改左侧 180px 固定栏（项目 / 主题 / 全部标签），
 *               结果区顶部给激活筛选摘要与逐项清除；新增 topic 参数（主题 key → 标签集合 hasSome），
 *               点主题会清掉单标签、点单标签会清掉主题；标签全量收进 details，不再默认铺 12 个。
 *               计数在同一次 facets 查询里派生，首屏仍为 2 次数据库查询（O8）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Timeline } from "@/components/Timeline";
import { db } from "@/lib/db";
import { ID_PATTERN, pickParam } from "@/lib/forms";
import { extractSnippet, highlightSegments } from "@/lib/highlight";
import { getLogFacets, getLogList, searchLogsLimited } from "@/lib/logs";
import { isTopicKey, topicLabel, type TopicKey } from "@/lib/topics";

export const metadata: Metadata = {
  title: "开发日志",
  description:
    "按项目与标签筛选的开发复盘：每条都分成 BEFORE 判断与 AFTER 验证两段，页尾附正文 SHA-256 摘要与发布时间，可核对是否被改动。",
};

type LogsPageProps = {
  searchParams: Promise<{
    project?: string | string[];
    tag?: string | string[];
    topic?: string | string[];
    q?: string | string[];
    cursor?: string | string[];
  }>;
};

function logsHref(params: {
  project?: string;
  tag?: string;
  topic?: string;
  q?: string;
  cursor?: string;
}) {
  const search = new URLSearchParams();
  if (params.project) search.set("project", params.project);
  if (params.tag) search.set("tag", params.tag);
  if (params.topic) search.set("topic", params.topic);
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  const query = search.toString();
  return query ? `/logs?${query}` : "/logs";
}

// cursor 来自 URL：只接受库 id 形状（cuid 小写字母数字），非法值按首屏处理，
// 避免把脏值送进 Prisma 的 cursor
function parseCursor(value: string | undefined) {
  return value && ID_PATTERN.test(value) ? value : undefined;
}

function filterClass(active: boolean) {
  // 未选中也留一条透明下边线，否则选中态与 hover 会让文字基线跳 1px
  return active
    ? "border-b border-ink text-ink"
    : "border-b border-transparent text-ink-soft hover:border-ink hover:text-ink";
}

async function LogBoard({ searchParams }: LogsPageProps) {
  const { project, tag, topic, q, cursor: rawCursor } = await searchParams;
  const projectFilter = pickParam(project);
  const tagFilter = pickParam(tag);
  const rawTopic = pickParam(topic);
  // 主题 key 来自 URL：只接受 topics.ts 里登记的 8 个值，脏值按未筛选处理
  const topicFilter: TopicKey | undefined =
    rawTopic && isTopicKey(rawTopic) ? rawTopic : undefined;
  const qFilter = pickParam(q);
  const cursor = parseCursor(pickParam(rawCursor));

  const facets = await getLogFacets();
  const page = qFilter
    ? await searchLogsLimited({
        q: qFilter,
        project: projectFilter,
        tag: tagFilter,
        topic: topicFilter,
        cursor,
      })
    : await getLogList({
        project: projectFilter,
        tag: tagFilter,
        topic: topicFilter,
        cursor,
      });
  const items = page.items;

  // 搜索片段的正文只在展示层二次取：查询层白名单不含正文（O1），
  // 按当前页 id 取回三列即可；不把 beforeContent/afterContent 塞回列表查询。
  const bodies =
    qFilter && items.length > 0
      ? new Map(
          (
            await db.log.findMany({
              where: { id: { in: items.map((item) => item.id) } },
              select: { id: true, beforeContent: true, afterContent: true },
            })
          ).map((row) => [row.id, row]),
        )
      : null;

  const projectOptions = facets.projects;
  const tagOptions = facets.tags;
  const totalLogs = projectOptions.reduce((sum, item) => sum + item.count, 0);
  const hasFilter = Boolean(projectFilter || tagFilter || topicFilter || qFilter);

  // 激活筛选摘要：每一项都能单独撤掉，撤掉时保留其它条件
  const activeChips: { key: string; label: string; href: string }[] = [];

  if (projectFilter) {
    const name =
      projectOptions.find((item) => item.slug === projectFilter)?.name ??
      projectFilter;
    activeChips.push({
      key: "project",
      label: `项目：${name}`,
      href: logsHref({ tag: tagFilter, topic: topicFilter, q: qFilter }),
    });
  }

  if (topicFilter) {
    activeChips.push({
      key: "topic",
      label: `主题：${topicLabel(topicFilter)}`,
      href: logsHref({
        project: projectFilter,
        tag: tagFilter,
        q: qFilter,
      }),
    });
  }

  if (tagFilter) {
    activeChips.push({
      key: "tag",
      label: `标签：${tagFilter}`,
      href: logsHref({
        project: projectFilter,
        topic: topicFilter,
        q: qFilter,
      }),
    });
  }

  if (qFilter) {
    activeChips.push({
      key: "q",
      label: `关键词：${qFilter}`,
      href: logsHref({
        project: projectFilter,
        tag: tagFilter,
        topic: topicFilter,
      }),
    });
  }

  const tagChip = (item: string) => (
    <Link
      key={item}
      href={logsHref({
        project: projectFilter,
        // 点单标签时清掉主题：两者是不同层级的同一维度，叠在一起会得到空集
        tag: tagFilter === item ? undefined : item,
        q: qFilter,
      })}
      aria-current={tagFilter === item ? "true" : undefined}
      className={filterClass(tagFilter === item)}
    >
      {item}
    </Link>
  );

  const railLabel = (active: boolean) =>
    active
      ? "border-b border-ink text-ink"
      : "border-b border-transparent text-ink-soft hover:border-ink hover:text-ink";

  const rail = (
    <nav aria-label="日志筛选">
      <div>
        <div className="mb-3 font-mono text-[9px] tracking-[0.18em] text-ink-soft">
          项目
        </div>
        <ul className="space-y-1.5">
          <li>
            <Link
              href={logsHref({
                tag: tagFilter,
                topic: topicFilter,
                q: qFilter,
              })}
              aria-current={!projectFilter ? "true" : undefined}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className={railLabel(!projectFilter)}>全部</span>
              <span className="font-mono text-[9px] text-ink-soft">
                {totalLogs}
              </span>
            </Link>
          </li>
          {projectOptions.map(({ slug, name, count }) => (
            <li key={slug}>
              <Link
                href={logsHref({
                  project: projectFilter === slug ? undefined : slug,
                  tag: tagFilter,
                  topic: topicFilter,
                  q: qFilter,
                })}
                aria-current={projectFilter === slug ? "true" : undefined}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className={railLabel(projectFilter === slug)}>
                  {name}
                </span>
                <span className="font-mono text-[9px] text-ink-soft">
                  {count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 border-t border-hairline pt-4">
        <div className="mb-3 font-mono text-[9px] tracking-[0.18em] text-ink-soft">
          主题
        </div>
        <ul className="space-y-1.5">
          <li>
            <Link
              href={logsHref({
                project: projectFilter,
                tag: tagFilter,
                q: qFilter,
              })}
              aria-current={!topicFilter ? "true" : undefined}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className={railLabel(!topicFilter)}>全部主题</span>
              <span className="font-mono text-[9px] text-ink-soft">
                {totalLogs}
              </span>
            </Link>
          </li>
          {facets.topics.map((item) => (
            <li key={item.key}>
              <Link
                href={logsHref({
                  project: projectFilter,
                  // 点主题时清掉单标签：主题是标签的上层，叠着查会互相收窄
                  topic: topicFilter === item.key ? undefined : item.key,
                  q: qFilter,
                })}
                aria-current={topicFilter === item.key ? "true" : undefined}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className={railLabel(topicFilter === item.key)}>
                  {item.label}
                </span>
                <span className="font-mono text-[9px] text-ink-soft">
                  {item.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 border-t border-hairline pt-4">
        <div className="mb-3 font-mono text-[9px] tracking-[0.18em] text-ink-soft">
          标签
        </div>
        {tagFilter && (
          <p className="mb-2 text-[11px]">
            <Link
              href={logsHref({
                project: projectFilter,
                topic: topicFilter,
                q: qFilter,
              })}
              className="border-b border-ink text-ink"
            >
              {tagFilter} ×
            </Link>
          </p>
        )}
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-[10px] text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
            [ 全部 {tagOptions.length} 个标签 ]
          </summary>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[11px]">
            {tagOptions.map(tagChip)}
          </div>
        </details>
      </div>

      {hasFilter && (
        <Link
          href="/logs"
          className="mt-7 inline-block border-b border-ink text-[11px] text-ink"
        >
          清除全部筛选 ×
        </Link>
      )}
    </nav>
  );

  // F24：命中字段的片段行。仅当 q 非空且该字段内存在命中时渲染；
  // 纯文本预览（不经过 Markdown 渲染器），命中词由 highlightSegments 切段包 <mark>
  const snippetRow = (label: string, content: string) => {
    if (!qFilter) return null;

    const snip = extractSnippet(content, qFilter);

    if (!snip) return null;

    return (
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink">
        <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          {label}
        </span>{" "}
        {snip.leadingEllipsis && "…"}
        {snip.segments.map((seg, i) =>
          seg.match ? <mark key={i}>{seg.text}</mark> : seg.text,
        )}
        {snip.trailingEllipsis && "…"}
      </p>
    );
  };

  return (
    <>
      <form method="get" className="mb-10 flex items-baseline gap-4">
        <label
          htmlFor="log-search"
          className="font-sans text-[10px] text-ink-soft"
        >
          搜索
        </label>
        <input
          id="log-search"
          type="search"
          name="q"
          defaultValue={qFilter}
          placeholder="标题 / 正文 / 标签"
          className="border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
          aria-label="搜索日志"
        />
        <input type="hidden" name="project" value={projectFilter ?? ""} />
        <input type="hidden" name="tag" value={tagFilter ?? ""} />
        <input type="hidden" name="topic" value={topicFilter ?? ""} />
        <button
          type="submit"
          className="border-b border-ink font-sans text-sm text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
        >
          搜索
        </button>
      </form>

      <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <details className="group border-y border-hairline py-3 lg:hidden">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 font-sans text-xs text-ink [&::-webkit-details-marker]:hidden">
              <span>
                筛选
                {activeChips.length > 0 ? ` · ${activeChips.length} 项` : ""}
              </span>
              <span className="font-mono text-[10px] text-ink-soft group-open:hidden">
                [ 展开 ]
              </span>
              <span className="hidden font-mono text-[10px] text-ink-soft group-open:inline">
                [ 收起 ]
              </span>
            </summary>
            <div className="mt-5">{rail}</div>
          </details>
          <div className="hidden lg:block">{rail}</div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-hairline pb-3 text-[11px] text-ink-soft">
            <span className="font-mono text-[10px]">
              本页 {items.length} 条
              {page.nextCursor ? " · 还有下一页" : " · 已到末页"}
            </span>
            {activeChips.map((chip) => (
              <Link
                key={chip.key}
                href={chip.href}
                className="border-b border-transparent text-ink-soft hover:border-ink hover:text-ink"
              >
                {chip.label} ×
              </Link>
            ))}
            {activeChips.length > 0 && (
              <Link
                href="/logs"
                className="ml-auto border-b border-ink text-ink"
              >
                清除全部 ×
              </Link>
            )}
          </div>

          {items.length === 0 ? (
            <div>
              {qFilter ? (
                <>
                  <p className="font-sans text-xs text-ink-soft">
                    没有找到包含「
                    <code className="font-mono">{qFilter}</code>」的日志
                  </p>
                  <Link
                    href={logsHref({
                      project: projectFilter,
                      tag: tagFilter,
                      topic: topicFilter,
                    })}
                    className="mt-5 inline-block border-b border-ink font-mono text-[11px] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    清除搜索，看全部日志 →
                  </Link>
                </>
              ) : projectFilter || tagFilter || topicFilter ? (
                <>
                  <p className="font-sans text-xs text-ink-soft">
                    没有符合条件的日志
                  </p>
                  <Link
                    href="/logs"
                    className="mt-5 inline-block border-b border-ink font-mono text-[11px] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    清除筛选，看全部日志 →
                  </Link>
                </>
              ) : (
                <p className="font-sans text-xs text-ink-soft">还没有日志</p>
              )}
            </div>
          ) : (
            <ul className="@container border-t border-ink">
              {items.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-6 border-b border-hairline py-10 md:flex-row md:gap-10"
                >
                  <Timeline
                    beforeDate={log.beforeDate}
                    afterDate={log.afterDate}
                  />
                  <article className="flex-1">
                    <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
                      {log.project.name}
                    </p>
                    <h2 className="mt-2 text-xl font-medium">
                      <Link
                        href={`/u/${log.user.handle}/logs/${log.slug}`}
                        className="hover:underline hover:decoration-1 hover:underline-offset-4"
                      >
                        {qFilter
                          ? highlightSegments(log.title, qFilter).map(
                              (seg, i) =>
                                seg.match ? (
                                  <mark key={i}>{seg.text}</mark>
                                ) : (
                                  seg.text
                                ),
                            )
                          : log.title}
                      </Link>
                    </h2>
                    {log.tags.length > 0 && (
                      <p className="mt-3 font-mono text-[11px] text-ink-soft">
                        {log.tags.map((item, i) => (
                          <span key={item}>
                            {i > 0 && " · "}
                            <Link
                              href={`/tags/${encodeURIComponent(item)}`}
                              className="hover:text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
                            >
                              {item}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    {snippetRow(
                      "BEFORE",
                      bodies?.get(log.id)?.beforeContent ?? "",
                    )}
                    {snippetRow(
                      "AFTER",
                      bodies?.get(log.id)?.afterContent ?? "",
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}

          {page.nextCursor && (
            <nav className="mt-12 flex justify-end border-t border-hairline pt-6">
              <Link
                href={logsHref({
                  project: projectFilter,
                  tag: tagFilter,
                  topic: topicFilter,
                  q: qFilter,
                  cursor: page.nextCursor,
                })}
                className="border-b border-ink font-mono text-[11px] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
              >
                下一页 →
              </Link>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

export default function LogsPage({ searchParams }: LogsPageProps) {
  return (
    <main id="main" className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="mb-12 text-4xl font-medium tracking-tight">开发日志</h1>
      <Suspense
        fallback={<p className="font-sans text-sm text-ink-soft">加载中…</p>}
      >
        <LogBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
