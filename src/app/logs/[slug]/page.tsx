/**
 * 文件：src/app/logs/[slug]/page.tsx
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
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Seal } from "@/components/Seal";
import { Timeline } from "@/components/Timeline";
import { getSafeLogBySlug } from "@/lib/logs";
import { Markdown } from "@/lib/markdown";

// 列表页与搜索引擎要的摘要：优先用"经验总结"字段，它本身就是这条复盘的结论
function describeLog(log: { lessonLearned: string | null; beforeContent: string }) {
  const source = (log.lessonLearned?.trim() || log.beforeContent).replace(/\s+/g, " ");

  return source.length > 80 ? `${source.slice(0, 80)}…` : source;
}

export async function generateMetadata({
  params,
}: PageProps<"/logs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const log = await getSafeLogBySlug(slug);

  if (!log) {
    return { title: "日志不存在" };
  }

  return {
    title: log.title,
    description: describeLog(log),
  };
}

// 详情页按 slug 查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式。
// 404 状态码由 src/proxy.ts 前置判定，这里的 notFound 只是兜底
export const instant = false;

export default async function LogDetailPage({
  params,
}: PageProps<"/logs/[slug]">) {
  const { slug } = await params;
  const log = await getSafeLogBySlug(slug);

  if (!log) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/logs"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 开发日志
      </Link>

      <header className="mt-8 border-b border-hairline pb-8">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
          {log.project.name}
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {log.title}
        </h1>
        <div className="@container mt-6">
          <Timeline beforeDate={log.beforeDate} afterDate={log.afterDate} />
        </div>
        {log.tags.length > 0 && (
          <p className="mt-6 font-mono text-[11px] text-ink-soft">
            {log.tags.join(" · ")}
          </p>
        )}
      </header>

      <section className="mt-12">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          BEFORE
        </h2>
        <div className="mt-4">
          <Markdown source={log.beforeContent} />
        </div>
      </section>

      {log.afterContent && (
        <section className="mt-12">
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            AFTER
          </h2>
          <div className="mt-4">
            <Markdown source={log.afterContent} />
          </div>
        </section>
      )}

      {log.lessonLearned && (
        <section className="mt-12">
          <h2 className="font-sans text-[10px] text-ink-soft">经验总结</h2>
          <div className="mt-4">
            <Markdown source={log.lessonLearned} />
          </div>
        </section>
      )}

      {log.contentHash && log.publishedAt ? (
        <Seal contentHash={log.contentHash} publishedAt={log.publishedAt} />
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
    </main>
  );
}
