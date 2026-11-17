/**
 * 文件：src/app/admin/logs/[id]/preview/page.tsx
 * 描述：草稿预览：用详情页同一套排版渲染未发布内容，仅登录态可见，不对外暴露
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 A5）。编辑器右栏只能看 Markdown 片段，看不到“发布后长什么样”：
 *               标题层级、时间轴、正文行宽、目录外的一切都在页面层。本页复用 Markdown / Timeline /
 *               SectionHead，不复制详情页的印章与 SEO 输出——草稿没有哈希与发布时间。
 *               与 G7（公开预览链接）的区别：本页不产生 token、不出登录态，属后台自查工具。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SectionHead } from "@/components/SectionHead";
import { Timeline } from "@/components/Timeline";
import { requireAdminSession } from "@/auth";
import { getAdminLogById, getLogContext } from "@/lib/logs";
import { Markdown } from "@/lib/markdown";
import { estimateReadingMinutes } from "@/lib/reading-time";

export const metadata: Metadata = {
  title: "预览",
  robots: { index: false, follow: false },
};

// 本页读会话与单条日志，导航进来必然阻塞。instant = false 只用于退出即时导航校验
export const instant = false;

type PreviewLogPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PreviewLogPage({ params }: PreviewLogPageProps) {
  const { id } = await params;
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/logs/${id}/preview`)}`);
  }

  const log = await getAdminLogById(id, session.userId);

  // 不落公共 404：那页只给前台出口，从后台点进一条已删日志就回不来。
  // 与编辑页同口径，在后台外壳内给提示面板
  if (!log) {
    return (
      <>
        <h1 className="text-3xl font-medium tracking-tight">预览</h1>
        <p className="mt-6 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          这条日志不存在，或已被彻底删除。
        </p>
        <Link
          href="/admin/logs"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          ← 返回日志列表
        </Link>
      </>
    );
  }

  // 内链在预览里也要能用：目标表复用详情页同一套“同作者已发布日志”口径，
  // 草稿目标不会出现在表里，仍显示 `[[slug]]` 原文
  const context = await getLogContext({
    id: log.id,
    slug: log.slug,
    userId: log.userId,
    tags: log.tags,
    projectId: log.projectId,
    series: log.series,
  });
  const logLinks = {
    links: Object.fromEntries(
      context.catalog.map((item) => [item.slug, item.title]),
    ),
    href: (target: string) =>
      log.user ? `/u/${log.user.handle}/logs/${target}` : `/logs/${target}`,
  };
  const minutes = estimateReadingMinutes(
    [log.beforeContent, log.afterContent ?? "", log.lessonLearned ?? ""].join(
      "\n",
    ),
  );

  return (
    <>
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3 border border-ink px-4 py-3">
        <p className="font-sans text-[11px] text-ink">
          预览 ·{" "}
          <span className="text-ink-soft">
            这是库中当前内容，发布前只有登录可见；发布后才会生成内容摘要与发布时间
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
          {minutes > 0 && (
            <p className="mt-4 font-sans text-[11px] text-ink-soft">
              约 <span className="font-mono">{minutes}</span> 分钟读完
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
    </>
  );
}
