/**
 * 文件：src/app/u/[handle]/logs/[slug]/page.tsx
 * 描述：日志详情：720px 宋体正文、BEFORE/AFTER 双段 Markdown、底部防伪印章
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建；未发布或不存在的 slug 一律 404
 * - 2026-10-30: 更正注释：pPR 下页面级 notFound 只能返回 200，真 404 由 src/proxy.ts 前置判定
 * - 2026-11-02: 更正 instant 注释：false 是退出即时导航校验，不是把路由改成动态
 * - 2026-11-03: 按日志标题生成页面标题、以经验总结作描述；已发布但缺摘要时改为显式告警而不是静默不画印章
 * - 2026-11-03: 告警文案中性化（"存证缺失"→"摘要缺失"），只说"无法核对是否被改动"，不自称存证或权属凭证
 * - 2026-11-06: 第二批去英文——区块标题 LESSON LEARNED 改「经验总结」并改走 font-sans（去 0.2em 宽字距）；BEFORE / AFTER 作为系统专有术语按负责人裁定保留等宽英文
 * - 2026-11-06: Timeline 外层 `<div className="mt-6">` 加 `@container`：详情页正文限宽 720px ≥ 576px，时间轴仍取 200px，与改前一致
 *               （这个调用点此前不在"三处"清单里——实际是四处，本轮一并补上）
 * - 2026-11-09: V2.0 Step 3 阶段一：路由迁至 /u/[handle]/logs/[slug]，params 提取 handle 传入
 *               getSafeLogBySlug（默认参数已移除）；页内"← 开发日志"等回跳链接随大厅路由保持 /logs
 * - 2026-11-10: V2.0 Step 6 Commit 3：正文末尾（印章上方）按 log.isAiAssisted 打「[ AI 辅助生成 · 作者审校 ]」
 *               纯文本标签；另把文件头里的路径行从退役的 src/app/logs/[slug] 校正为当前路径
 * - 2026-11-11: F23/D34 接线阅读目录与进度条：≥1024px 正文左 + 目录右栏（grid+sticky），<1024px 折叠面板
 *               在正文头部；BEFORE/AFTER 经 extractToc 抽锚点、总标题数 ≥2 才画；进度条为整页口径 CSS 滚动驱动动画（零 JS）；
 *               经验总结段不索引；无目录时 main 放宽到 1080px 但正文仍 mx-auto 限宽 720px，与改前观感一致
 * - 2026-11-12: F26 标签聚合：header 标签改 Link 指向 /tags/[tag]
 * - 2026-11-13: 显著升级 B2：头部加阅读时长（纯函数 reading-time）；印章升级为档案凭据卡（复制链接 / 哈希）；
 *               尾部加前后篇与相关阅读（同标签优先、同项目兜底，见 lib/related.ts）
 * - 2026-11-13: 本轮升级（SEO）：generateMetadata 补 canonical 与 OG article（发布时间/标签/作者），
 *               正文头部输出 JSON-LD BlogPosting（序列化时转义 <，防 </script> 截断）
 * - 2026-11-16: 重构 B0：「← 开发日志」回跳改为面包屑（档案 / 开发日志 / 项目 / 当前页）；
 *               BEFORE / AFTER / 经验总结三段改用 SectionHead（编号 + 双线边界），经验总结收进 2px 棕左线引用块；
 *               正文包进 ZoomableArticle 接管图片灯箱（事件委托，不注入 HTML）；
 *               相邻日志与相关阅读加 no-print，打印时只留正文与印章
 * - 2026-11-16: 评审 G1：正文 `[[slug]]` 渲染为同作者已发布日志的内链（显示目标标题）；
 *               目标表取自已有的 getLogContext 查询，未命中保留原文；"被引用"反向列表另轮裁定
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArticleTocPanel,
  ArticleTocRail,
  type TocGroup,
} from "@/components/trace/ArticleToc";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { EvidencePanel, Stamp } from "@/components/trace/Seal";
import { SectionHead } from "@/components/site/SectionHead";
import { Timeline } from "@/components/trace/Timeline";
import { ZoomableArticle } from "@/components/trace/ZoomableArticle";
import {
  getLogBacklinks,
  getLogContext,
  getPublishedRevisionByVersion,
  getSafeLogBySlug,
  listPublishedVersions,
} from "@/lib/logs";
import { Markdown } from "@/lib/markdown";
import { estimateReadingMinutes } from "@/lib/reading-time";
import { siteName, siteUrl } from "@/lib/site";
import { extractToc } from "@/lib/toc";

// 列表页与搜索引擎要的摘要：优先用"经验总结"字段，它本身就是这条复盘的结论
function describeLog(log: { lessonLearned: string | null; beforeContent: string }) {
  const source = (log.lessonLearned?.trim() || log.beforeContent).replace(/\s+/g, " ");

  return source.length > 80 ? `${source.slice(0, 80)}…` : source;
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[handle]/logs/[slug]">): Promise<Metadata> {
  const { handle, slug } = await params;
  const log = await getSafeLogBySlug(slug, handle);

  if (!log) {
    return { title: "日志不存在" };
  }

  return {
    title: log.title,
    description: describeLog(log),
    // 规范地址：同一篇日志可能带查询参数或末尾斜杠进来，canonical 收敛到唯一 URL
    alternates: { canonical: `/u/${handle}/logs/${slug}` },
    openGraph: {
      type: "article",
      title: log.title,
      description: describeLog(log),
      url: `${siteUrl()}/u/${handle}/logs/${slug}`,
      publishedTime: (log.publishedAt ?? log.beforeDate).toISOString(),
      modifiedTime: log.updatedAt.toISOString(),
      authors: [handle],
      tags: log.tags,
    },
  };
}

// 详情页按 slug 查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式。
// 404 状态码由 src/proxy.ts 前置判定，这里的 notFound 只是兜底
export const instant = false;

export default async function LogDetailPage({
  params,
  searchParams,
}: PageProps<"/u/[handle]/logs/[slug]">) {
  const { handle, slug } = await params;
  const query = await searchParams;
  const log = await getSafeLogBySlug(slug, handle);

  if (!log) {
    notFound();
  }

  // V5 Phase 1：?v=N 版本视图——取该版本的发布快照渲染内容与证据；版本不存在按 404 处理，
  // 不静默回落到当前版（读者要的是那版，给错了版本等于核验错位）
  const rawV = Array.isArray(query.v) ? query.v[0] : query.v;
  const versionNum = rawV ? Number(rawV) : null;
  const versioned =
    versionNum !== null && Number.isInteger(versionNum) && versionNum >= 1
      ? await getPublishedRevisionByVersion(slug, handle, versionNum)
      : null;

  if (rawV && (versionNum === null || !Number.isInteger(versionNum) || versionNum < 1 || !versioned)) {
    notFound();
  }

  const rev = versioned?.revisions[0] ?? null;
  const view = rev
    ? {
        title: rev.title,
        beforeContent: rev.beforeContent,
        afterContent: rev.afterContent,
        tags: rev.tags,
        lessonLearned: null,
        contentHash: rev.contentHash,
        publishedAt: rev.publishedAt,
        hashVersion: rev.hashVersion,
        version: rev.version,
        gitSha: rev.gitSha ?? null,
        gitTag: rev.gitTag ?? null,
        verdict: rev.verdictAtPublish,
      }
    : {
        title: log.title,
        beforeContent: log.beforeContent,
        afterContent: log.afterContent,
        tags: log.tags,
        lessonLearned: log.lessonLearned,
        contentHash: log.contentHash,
        publishedAt: log.publishedAt,
        hashVersion: log.hashVersion,
        version: undefined,
        gitSha: null,
        gitTag: null,
        verdict: log.verdict,
      };
  const versions = await listPublishedVersions(slug, handle);
  const versionNumbers = (versions ?? []).map((item) => item.version).sort((a, b) => a - b);

  // B2：前后篇与相关阅读共用一次列表查询；阅读时长是纯函数，不碰数据库
  const context = await getLogContext({
    id: log.id,
    slug: log.slug,
    userId: log.userId,
    tags: log.tags,
    projectId: log.projectId,
    series: log.series,
  });
  // G1 第二刀：反向引用只查同作者已发布日志；草稿里的引用不算，且不泄露未发布内容
  const backlinks = await getLogBacklinks({
    userId: log.userId,
    slug,
    take: 10,
  });
  const minutes = estimateReadingMinutes(
    [view.beforeContent, view.afterContent ?? "", view.lessonLearned ?? ""].join(
      "\n",
    ),
  );
  const relatedLabel =
    context.relatedReason === "tag"
      ? "同标签相关"
      : context.relatedReason === "project"
        ? "同项目最近发布"
        : "相关阅读";
  // G1 内链解析表：只用本租户已发布日志，草稿与别家 slug 不在表中——未命中就保留原文，
  // 既不造死链，也不会因链接暴露未发布内容的存在性
  const logLinks = {
    links: Object.fromEntries(
      context.catalog.map((item) => [item.slug, item.title]),
    ),
    href: (target: string) => `/u/${handle}/logs/${target}`,
  };
  const logPath = `/u/${handle}/logs/${slug}`;

  // 结构化数据（BlogPosting）：让搜索引擎把每条日志识别为一篇带发布时间的文章。
  // 序列化时把 < 转义成 \u003c——正文/标题里的 `</script>` 不能把内联脚本提前闭合。
  // 这里不渲染任何作者 HTML，只输出 JSON，故不经过 rehype-sanitize 管线
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: view.title,
    description: describeLog(view),
    datePublished: (view.publishedAt ?? log.beforeDate).toISOString(),
    dateModified: log.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: handle,
      url: `${siteUrl()}/u/${handle}`,
    },
    publisher: { "@type": "Organization", name: siteName, url: siteUrl() },
    url: `${siteUrl()}${logPath}`,
    mainEntityOfPage: `${siteUrl()}${logPath}`,
    keywords: view.tags.join(","),
    isPartOf: {
      "@type": "Blog",
      name: `${siteName} · 开发日志`,
      url: `${siteUrl()}/logs`,
    },
  }).replace(/</g, "\\u003c");

  // F23：BEFORE/AFTER 各抽一组锚点（经验总结是短结论，不索引）；总标题数 ≥2 才画目录——
  // 单标题文章没有导航价值。两组前缀独立从 0 起，与 Markdown 的 tocIdPrefix 一一对应
  const tocGroups: TocGroup[] = [
    { key: "before", label: "BEFORE", items: extractToc(view.beforeContent, "before") },
    ...(view.afterContent
      ? [{ key: "after", label: "AFTER", items: extractToc(view.afterContent, "after") }]
      : []),
  ].filter((group) => group.items.length > 0);
  const showToc = tocGroups.reduce((sum, group) => sum + group.items.length, 0) >= 2;
  const evidence =
    view.contentHash && view.publishedAt
      ? {
          contentHash: view.contentHash,
          publishedAt: view.publishedAt,
          version: view.version,
          hashVersion: view.hashVersion,
          gitSha: view.gitSha,
          gitTag: view.gitTag,
          verdict: view.verdict,
        }
      : null;
  const hasRail = showToc || Boolean(evidence);

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-16 max-md:py-8">
      <script
        type="application/ld+json"
        // 结构化数据只能是字符串正文；< 已在序列化时转义，作者内容无法闭合标签
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="reading-progress" aria-hidden="true" />
      <div
        className={
          hasRail
            ? "lg:grid lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)] lg:gap-10"
            : undefined
        }
      >
        <article
          className={
            hasRail
              ? "mx-auto w-full max-w-[720px] lg:mx-0"
              : "mx-auto w-full max-w-[720px]"
          }
        >
          <Breadcrumbs
            items={[
              { label: "档案", href: "/" },
              { label: "开发日志", href: "/logs" },
              {
                label: log.project.name,
                href: `/u/${handle}/projects/${log.project.slug}`,
              },
              // 末项=当前页，但截断到 20 字：完整标题紧挨 H1 会重复，长标题还会把面包屑撑成两行
              {
                label:
                  view.title.length > 20
                    ? `${view.title.slice(0, 20)}…`
                    : view.title,
              },
            ]}
          />

          <header className="mt-3 pb-5 rule-double">
            <h1 className="text-[32px] font-medium leading-[1.2] tracking-tight max-md:text-[30px]">
              {view.title}
            </h1>
            <div className="@container mt-3">
              <Timeline
                beforeDate={log.beforeDate}
                afterDate={log.afterDate}
                variant="inline"
              />
            </div>
            {(view.tags.length > 0 || minutes > 0 || context.seriesInfo) && (
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                {log.tags.length > 0 && (
                  <p className="font-mono text-xs text-ink-soft">
                    {view.tags.map((item, i) => (
                      <span key={item}>
                        {i > 0 && " · "}
                        <Link href={`/tags/${encodeURIComponent(item)}`} className="hover:text-ink hover:underline hover:decoration-1 hover:underline-offset-4">{item}</Link>
                      </span>
                    ))}
                  </p>
                )}
                {minutes > 0 && (
                  <p className="font-sans text-xs text-ink-soft">约 <span className="font-mono">{minutes}</span> 分钟读完</p>
                )}
                {context.seriesInfo && (
                  <p className="font-sans text-xs text-ink-soft">
                    系列 ·{" "}
                    <Link href={`/u/${handle}/series/${encodeURIComponent(context.seriesInfo.name)}`} className="text-ink hover:underline hover:decoration-1 hover:underline-offset-4">{context.seriesInfo.name}</Link>{" "}
                    · 第 <span className="font-mono">{context.seriesInfo.position}</span> / <span className="font-mono">{context.seriesInfo.total}</span> 篇
                  </p>
                )}
              </div>
            )}
          </header>

          {view.version !== undefined && (
            <div className="mt-6 border border-brown px-4 py-2 font-sans text-xs text-ink">
              当前显示第 <span className="font-mono">v{view.version}</span> 版（历史发布快照）。
              <Link href={logPath} className="ml-3 border-b border-brown text-brown">
                返回当前版
              </Link>
            </div>
          )}

          <ZoomableArticle>
            <section className="mt-6">
              <SectionHead index="01" title="BEFORE" mono />
              <div className="mt-6">
                <Markdown
                  source={view.beforeContent}
                  tocIdPrefix={showToc ? "before" : undefined}
                  logLinks={logLinks}
                />
              </div>
            </section>

            {evidence && (
              <div className="mt-8 lg:hidden print:hidden">
                <EvidencePanel
                  variant="mobile"
                  contentHash={evidence.contentHash}
                  publishedAt={evidence.publishedAt}
                  sourceCommitSha={log.sourceCommitSha}
                  repoUrl={log.project.repoUrl}
                  title={view.title}
                  path={logPath}
                  version={evidence.version}
                  hashVersion={evidence.hashVersion}
                  gitSha={evidence.gitSha}
                  gitTag={evidence.gitTag}
                  verdict={evidence.verdict}
                  versions={versionNumbers}
                />
              </div>
            )}

            {showToc && <ArticleTocPanel groups={tocGroups} />}

            {view.afterContent && (
              <section className="mt-16">
                <SectionHead index="02" title="AFTER" mono />
                <div className="mt-6">
                  <Markdown
                    source={view.afterContent}
                    tocIdPrefix={showToc ? "after" : undefined}
                    logLinks={logLinks}
                  />
                </div>
              </section>
            )}

            {view.lessonLearned && (
              <section className="mt-16">
                <SectionHead
                  index={view.afterContent ? "03" : "02"}
                  title="经验总结"
                />
                <blockquote className="mt-6 border-l-2 border-brown pl-5">
                  <Markdown source={view.lessonLearned} logLinks={logLinks} />
                </blockquote>
              </section>
            )}
          </ZoomableArticle>

          {log.isAiAssisted && (
            <p className="mt-10 font-mono text-[10px] text-ink-soft">
              [ AI 辅助生成 · 作者审校 ]
            </p>
          )}

          {evidence ? (
            <Stamp publishedAt={evidence.publishedAt} />
          ) : (
            // 前台只渲染已发布日志，走到这里说明摘要字段缺失——宁可显式告警，也不能"安静地没有印章"
            <div className="mt-16 border border-ink p-5 font-mono text-[11px] leading-relaxed text-ink">
              <p className="tracking-[0.2em]">摘要缺失</p>
              <p className="mt-3 text-ink-soft">
                这条日志已发布，但库中缺少正文摘要或发布时间记录，因此无法核对内容是否被改动。
                请在后台重新发布一次补齐；缺失期间，本页不构成内容未被篡改的证明。
              </p>
            </div>
          )}

          {(context.older || context.newer) && (
            <nav
              aria-label="相邻日志"
              className="no-print mt-10 grid gap-6 border-t border-ink pt-6 sm:grid-cols-2"
            >
              {context.older ? (
                <Link
                  href={`/u/${handle}/logs/${context.older.slug}`}
                  className="group block"
                >
                  <span className="font-mono text-xs tracking-[0.16em] text-ink-soft">
                    ← 上一篇
                  </span>
                  <span className="mt-1 block text-sm font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                    {context.older.title}
                  </span>
                </Link>
              ) : (
                <span aria-hidden />
              )}

              {context.newer ? (
                <Link
                  href={`/u/${handle}/logs/${context.newer.slug}`}
                  className="group block sm:text-right"
                >
                  <span className="font-mono text-xs tracking-[0.16em] text-ink-soft">
                    下一篇 →
                  </span>
                  <span className="mt-1 block text-sm font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                    {context.newer.title}
                  </span>
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          )}

          {context.related.length > 0 && (
            <section className="no-print mt-10 border-t border-hairline pt-5">
              <h2 className="font-mono text-xs tracking-[0.18em] text-ink-soft">
                {relatedLabel}
              </h2>
              <ul className="mt-2">
                {context.related.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-2.5"
                  >
                    <Link
                      href={`/u/${handle}/logs/${item.slug}`}
                      className="text-sm hover:underline hover:decoration-1 hover:underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <span className="font-mono text-[10px] text-ink-soft">
                      {item.beforeDate.toISOString().slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {backlinks.length > 0 && (
            <section className="no-print mt-10 border-t border-hairline pt-5">
              <h2 className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
                被引用
              </h2>
              <ul className="mt-2">
                {backlinks.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-2.5"
                  >
                    <Link
                      href={`/u/${handle}/logs/${item.slug}`}
                      className="text-sm hover:underline hover:decoration-1 hover:underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <span className="font-mono text-[10px] text-ink-soft">
                      {item.beforeDate.toISOString().slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
        {hasRail && (
          <aside className="hidden lg:block print:block">
            {evidence && (
              <EvidencePanel
                contentHash={evidence.contentHash}
                publishedAt={evidence.publishedAt}
                sourceCommitSha={log.sourceCommitSha}
                repoUrl={log.project.repoUrl}
                title={view.title}
                path={logPath}
                version={evidence.version}
                hashVersion={evidence.hashVersion}
                gitSha={evidence.gitSha}
                gitTag={evidence.gitTag}
                verdict={evidence.verdict}
                versions={versionNumbers}
              />
            )}
            {showToc && <ArticleTocRail groups={tocGroups} />}
          </aside>
        )}
      </div>
    </main>
  );
}