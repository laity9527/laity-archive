/**
 * 文件：src/app/logs/[slug]/page.tsx
 * 描述：日志详情：720px 宋体正文、BEFORE/AFTER 双段 Markdown、底部防伪印章
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建；未发布或不存在的 slug 一律 404
 * - 2026-10-30: 更正注释：pPR 下页面级 notFound 只能返回 200，真 404 由 src/proxy.ts 前置判定
 * - 2026-11-02: 更正 instant 注释：false 是退出即时导航校验，不是把路由改成动态
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Seal } from "@/components/Seal";
import { Timeline } from "@/components/Timeline";
import { getSafeLogBySlug } from "@/lib/logs";
import { Markdown } from "@/lib/markdown";

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
    <main className="mx-auto max-w-[720px] px-6 py-24">
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
        <div className="mt-6">
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
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            LESSON LEARNED
          </h2>
          <div className="mt-4">
            <Markdown source={log.lessonLearned} />
          </div>
        </section>
      )}

      {log.contentHash && log.publishedAt && (
        <Seal contentHash={log.contentHash} publishedAt={log.publishedAt} />
      )}
    </main>
  );
}
