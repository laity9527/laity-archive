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
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Timeline } from "@/components/Timeline";
import { pickParam } from "@/lib/forms";
import { extractSnippet, highlightSegments } from "@/lib/highlight";
import { getSafeLogs, searchLogs } from "@/lib/logs";

export const metadata: Metadata = {
  title: "开发日志",
  description:
    "按项目与标签筛选的开发复盘：每条都分成 BEFORE 判断与 AFTER 验证两段，页尾附正文 SHA-256 摘要与发布时间，可核对是否被改动。",
};

type LogsPageProps = {
  searchParams: Promise<{
    project?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
};

// 标签筛选区默认可见的上限，超出部分收进原生 details 折叠
const TAG_LIMIT = 12;

function logsHref(params: { project?: string; tag?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.project) search.set("project", params.project);
  if (params.tag) search.set("tag", params.tag);
  if (params.q) search.set("q", params.q);
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
  const { project, tag, q } = await searchParams;
  const projectFilter = pickParam(project);
  const tagFilter = pickParam(tag);
  const qFilter = pickParam(q);

  const all = await getSafeLogs();
  const logs = qFilter
    ? await searchLogs({ q: qFilter, project: projectFilter, tag: tagFilter })
    : projectFilter || tagFilter
      ? await getSafeLogs({ project: projectFilter, tag: tagFilter })
      : all;

  const projectOptions = [
    ...new Map(all.map((log) => [log.project.slug, log.project.name])),
  ];
  const tagOptions = [...new Set(all.flatMap((log) => log.tags))];
  // 标签已有 52 个，全量渲染会堆成六七行文字墙；默认只留前 TAG_LIMIT 个，其余收进原生 details
  const shownTags = tagOptions.slice(0, TAG_LIMIT);
  let hiddenTags = tagOptions.slice(TAG_LIMIT);
  // 选中的标签若落在折叠区里，收起态就看不出"当前筛的是哪一个"，所以并进可见组
  if (tagFilter && hiddenTags.includes(tagFilter)) {
    shownTags.push(tagFilter);
    hiddenTags = hiddenTags.filter((item) => item !== tagFilter);
  }

  const tagChip = (item: string) => (
    <Link
      key={item}
      href={logsHref({
        project: projectFilter,
        tag: tagFilter === item ? undefined : item,
        q: qFilter,
      })}
      className={filterClass(tagFilter === item)}
    >
      {item}
    </Link>
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
      <form method="get" className="mb-8 flex items-baseline gap-4">
        <label htmlFor="log-search" className="font-sans text-[10px] text-ink-soft">
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
        <button
          type="submit"
          className="border-b border-ink font-sans text-sm text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
        >
          搜索
        </button>
      </form>

      <nav className="mb-12 flex flex-col gap-4 border-y border-hairline py-4 md:flex-row md:items-baseline md:gap-10">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
          <span className="font-sans text-[10px] text-ink-soft">项目</span>
          <Link
            href={logsHref({ tag: tagFilter, q: qFilter })}
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
                q: qFilter,
              })}
              className={filterClass(projectFilter === slug)}
            >
              {name}
            </Link>
          ))}
        </div>
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 md:ml-auto">
            <span className="font-sans text-[10px] text-ink-soft">标签</span>
            {shownTags.map(tagChip)}
            {hiddenTags.length > 0 && (
              <details className="group basis-full">
                <summary
                  className={`${filterClass(false)} w-fit cursor-pointer list-none font-mono text-[11px] [&::-webkit-details-marker]:hidden`}
                >
                  <span className="group-open:hidden">[ + 展开全部标签 ]</span>
                  <span className="hidden group-open:inline">
                    [ − 收起全部标签 ]
                  </span>
                </summary>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-3">
                  {hiddenTags.map(tagChip)}
                </div>
              </details>
            )}
          </div>
        )}
      </nav>

      {logs.length === 0 ? (
        <div>
          {qFilter ? (
            <>
              <p className="font-sans text-xs text-ink-soft">
                没有找到包含「<code className="font-mono">{qFilter}</code>」的日志
              </p>
              <Link
                href={logsHref({ project: projectFilter, tag: tagFilter })}
                className="mt-5 inline-block border-b border-ink font-mono text-[11px] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
              >
                清除搜索，看全部日志 →
              </Link>
            </>
          ) : projectFilter || tagFilter ? (
            <>
              <p className="font-sans text-xs text-ink-soft">没有符合条件的日志</p>
              <Link
                href={logsHref({})}
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
                    href={`/u/${log.user.handle}/logs/${log.slug}`}
                    className="hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {qFilter
                      ? highlightSegments(log.title, qFilter).map((seg, i) =>
                          seg.match ? <mark key={i}>{seg.text}</mark> : seg.text,
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
                {snippetRow("BEFORE", log.beforeContent)}
                {snippetRow("AFTER", log.afterContent ?? "")}
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
        fallback={<p className="font-sans text-sm text-ink-soft">加载中…</p>}
      >
        <LogBoard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
