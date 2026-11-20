/**
 * 文件：src/app/admin/logs/[id]/snapshot/page.tsx
 * 描述：上次发布快照：只读渲染发布当时保存的标题/正文/标签/系列，供与当前草稿对比
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G8）。快照是“上次对外长什么样”的证据，不随编辑变化；
 *               本页不写库、不发布、不出登录态。快照缺失或损坏时给面板，不猜内容
 * - 2026-11-20: a11y 二期 L6：主分支文章标题 h1 降级为 h2（源码中第二个 h1），视觉 className 不变
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SectionHead } from "@/components/site/SectionHead";
import { requireAdminSession } from "@/auth";
import { getAdminLogById, getLogContext } from "@/lib/logs";
import { Markdown } from "@/lib/markdown";
import { parsePublishedSnapshot } from "@/lib/published-snapshot";

export const metadata: Metadata = {
  title: "上次发布快照",
  robots: { index: false, follow: false },
};

export const instant = false;

type SnapshotPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SnapshotPage({ params }: SnapshotPageProps) {
  const { id } = await params;
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/admin/logs/${id}/snapshot`)}`,
    );
  }

  const log = await getAdminLogById(id, session.userId);
  const snapshot = log
    ? parsePublishedSnapshot(log.lastPublishedSnapshot)
    : null;

  if (!log || !snapshot) {
    return (
      <>
        <h1 className="text-3xl font-medium tracking-tight">上次发布快照</h1>
        <p className="mt-6 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          {log
            ? "这条日志还没有发布过快照。发布一次后再回来。"
            : "这条日志不存在，或已被彻底删除。"}
        </p>
        <Link
          href={log ? `/admin/logs/${log.id}/edit` : "/admin/logs"}
          className="border-b border-ink font-sans text-xs text-ink"
        >
          {log ? "← 返回编辑" : "← 返回日志列表"}
        </Link>
      </>
    );
  }

  const context = await getLogContext({
    id: log.id,
    slug: log.slug,
    userId: log.userId,
    tags: snapshot.tags,
    projectId: log.projectId,
    series: snapshot.series,
  });
  const logLinks = {
    links: Object.fromEntries(
      context.catalog.map((item) => [item.slug, item.title]),
    ),
    href: (target: string) =>
      log.user ? `/u/${log.user.handle}/logs/${target}` : `/logs/${target}`,
  };
  const published = snapshot.publishedAt.slice(0, 16).replace("T", " ");

  return (
    <>
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3 border border-ink px-4 py-3">
        <p className="font-sans text-[11px] text-ink">
          上次发布快照 ·{" "}
          <span className="font-mono text-ink-soft">{published} UTC</span> ·{" "}
          <span className="font-mono text-ink-soft">
            {snapshot.contentHash.slice(0, 12)}…
          </span>
        </p>
        <span className="flex items-baseline gap-4 font-sans text-[11px]">
          <Link
            href={`/admin/logs/${log.id}/edit`}
            className="border-b border-ink text-ink"
          >
            返回编辑
          </Link>
          {log.isPublished && log.user && (
            <Link
              href={`/u/${log.user.handle}/logs/${log.slug}`}
              className="border-b border-ink text-ink"
            >
              看前台
            </Link>
          )}
        </span>
      </div>

      <article className="mx-auto w-full max-w-[720px]">
        <header className="pb-8 rule-double">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
            {log.project.name}
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">
            {snapshot.title}
          </h2>
          {snapshot.tags.length > 0 && (
            <p className="mt-4 font-mono text-[11px] text-ink-soft">
              {snapshot.tags.join(" · ")}
            </p>
          )}
          {snapshot.series && (
            <p className="mt-2 font-sans text-[11px] text-ink-soft">
              系列 · {snapshot.series}
            </p>
          )}
        </header>

        <section className="mt-16">
          <SectionHead index="01" title="BEFORE" mono />
          <div className="mt-6">
            <Markdown source={snapshot.beforeContent} logLinks={logLinks} />
          </div>
        </section>

        {snapshot.afterContent && (
          <section className="mt-16">
            <SectionHead index="02" title="AFTER" mono />
            <div className="mt-6">
              <Markdown source={snapshot.afterContent} logLinks={logLinks} />
            </div>
          </section>
        )}

        {snapshot.lessonLearned && (
          <section className="mt-16">
            <SectionHead
              index={snapshot.afterContent ? "03" : "02"}
              title="经验总结"
            />
            <blockquote className="mt-6 border-l-2 border-brown pl-5">
              <Markdown source={snapshot.lessonLearned} logLinks={logLinks} />
            </blockquote>
          </section>
        )}
      </article>
    </>
  );
}
