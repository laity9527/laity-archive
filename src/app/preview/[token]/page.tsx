/**
 * 文件：src/app/preview/[token]/page.tsx
 * 描述：公开预览页：凭 24h 有效期 token 只读查看日志当前内容，不索引、不出现在 sitemap
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G7，负责人已批准）。与登录态预览（A5）的区别：
 *               本页不要求登录，token 即凭证；不渲染印章/SEO/JSON-LD，robots noindex；
 *               token 过期或撤销后由 Proxy 前置判定 404，不泄露日志是否存在
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/SectionHead";
import { getLogContext } from "@/lib/logs";
import { Markdown } from "@/lib/markdown";
import { resolvePreviewToken } from "@/lib/preview";

export const metadata: Metadata = {
  title: "临时预览",
  robots: { index: false, follow: false },
};

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验
export const instant = false;

type PreviewPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicPreviewPage({ params }: PreviewPageProps) {
  const { token } = await params;
  const preview = await resolvePreviewToken(token);

  if (!preview) {
    notFound();
  }

  const { log, expiresAt } = preview;
  const context = log.userId
    ? await getLogContext({
        id: log.id,
        slug: log.slug,
        userId: log.userId,
        tags: log.tags,
        projectId: log.projectId,
        series: log.series,
      })
    : null;
  const logLinks = {
    links: Object.fromEntries(
      (context?.catalog ?? []).map((item) => [item.slug, item.title]),
    ),
    href: (target: string) =>
      log.user ? `/u/${log.user.handle}/logs/${target}` : `/logs/${target}`,
  };

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3 border border-ink px-4 py-3">
        <p className="font-sans text-[11px] text-ink">
          临时预览 ·{" "}
          <span className="text-ink-soft">
            仅持链接可见，有效期至{" "}
            <span className="font-mono">
              {expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC
            </span>
          </span>
        </p>
        <Link
          href="/logs"
          className="border-b border-ink font-sans text-[11px] text-ink"
        >
          已发布日志 →
        </Link>
      </div>

      <article className="mx-auto w-full max-w-[720px]">
        <header className="pb-8 rule-double">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
            {log.project.name}
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">
            {log.title}
          </h1>
          {log.tags.length > 0 && (
            <p className="mt-4 font-mono text-[11px] text-ink-soft">
              {log.tags.join(" · ")}
            </p>
          )}
          {log.series && (
            <p className="mt-2 font-sans text-[11px] text-ink-soft">
              系列 · {log.series}
            </p>
          )}
        </header>

        <section className="mt-16">
          <SectionHead index="01" title="BEFORE" mono />
          <div className="mt-6">
            <Markdown source={log.beforeContent} logLinks={logLinks} />
          </div>
        </section>

        {log.afterContent && (
          <section className="mt-16">
            <SectionHead index="02" title="AFTER" mono />
            <div className="mt-6">
              <Markdown source={log.afterContent} logLinks={logLinks} />
            </div>
          </section>
        )}

        {log.lessonLearned && (
          <section className="mt-16">
            <SectionHead
              index={log.afterContent ? "03" : "02"}
              title="经验总结"
            />
            <blockquote className="mt-6 border-l-2 border-brown pl-5">
              <Markdown source={log.lessonLearned} logLinks={logLinks} />
            </blockquote>
          </section>
        )}
      </article>
    </main>
  );
}
