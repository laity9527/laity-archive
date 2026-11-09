/**
 * 文件：src/app/u/[handle]/page.tsx
 * 描述：租户主页：该用户的档案看板与最新已发布日志（UI 复用首页两栏结构，数据源传入 handle）
 * 作者：张磊
 * 创建日期：2026-11-09
 * 修改记录：
 * - 2026-11-09: V2.0 Step 3 阶段一：创建。handle 不存在（库里无对应用户）走 notFound；
 *               看板与最新日志均按该租户 userId 取数（裁定 ① 的租户公开视图）；
 *               精选/看板/日志三处的跳转链接带本页 handle（/u/[handle]/... 体系）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getLatestLogs } from "@/lib/logs";
import { getArchiveBoard, resolveUserId } from "@/lib/projects";

// 详情页类路由：按 handle 查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const userId = await resolveUserId(handle);

  if (!userId) {
    return { title: "租户不存在" };
  }

  return {
    title: handle,
    description: `${handle} 的数字档案：档案看板与最新开发日志。`,
  };
}

async function TenantOverview({
  handle,
  userId,
}: {
  handle: string;
  userId: string;
}) {
  const [board, latestLogs] = await Promise.all([
    getArchiveBoard(userId),
    getLatestLogs(3, userId),
  ]);

  // 精选规则与首页同口径（无数据库字段）：有已发布日志的项目按最近更新取前 3；
  // 零日志项目只进状态看板，不进精选
  const featured = board.filter((project) => project.count > 0).slice(0, 3);

  return (
    <div className="md:flex md:items-start md:justify-between">
      {featured.length > 0 && (
        <section className="md:w-2/3 md:border-r md:border-hairline md:pr-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-sans text-[10px] text-ink-soft">精选项目</h2>
            <Link
              href="/projects"
              className="border-b border-ink font-mono text-[11px] hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              全部作品 →
            </Link>
          </div>
          <ul className="border-t border-ink">
            {featured.map((project) => (
              <li key={project.slug} className="border-b border-hairline py-6">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <Link
                    href={`/u/${handle}/projects/${project.slug}`}
                    className="text-lg hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {project.name}
                  </Link>
                  <span className="font-sans text-[11px] text-ink-soft">
                    {kindLabel(project.kind)} · {statusLabel(project.status)} ·{" "}
                    {logsCountLabel(project.count)}
                  </span>
                </div>
                {project.summary && (
                  <p className="mt-2 max-w-prose text-sm text-ink-soft">
                    {project.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`@container ${featured.length > 0 ? "mt-20 md:mt-0 md:w-1/3 md:pl-12" : "md:w-full"}`}>
        <section>
          <h2 className="mb-4 font-sans text-[10px] text-ink-soft">档案状态</h2>
          <StatusBoard entries={board} />
        </section>

        <section className="mt-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-sans text-[10px] text-ink-soft">最新日志</h2>
            <Link href="/logs" className="border-b border-ink text-sm">
              全部日志 →
            </Link>
          </div>
          {latestLogs.length === 0 ? (
            <p className="border-t border-ink py-6 font-sans text-xs text-ink-soft">
              暂无已发布日志
            </p>
          ) : (
            <ul className="border-t border-ink">
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
                        href={`/u/${handle}/logs/${log.slug}`}
                        className="hover:underline hover:decoration-1 hover:underline-offset-4"
                      >
                        {log.title}
                      </Link>
                    </h3>
                    {log.lessonLearned ? (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
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
    </div>
  );
}

export default async function TenantHomePage({
  params,
}: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const userId = await resolveUserId(handle);

  if (!userId) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          {handle}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          数字档案：该租户的档案看板与最新开发日志。
        </p>
      </header>

      <div className="mt-20">
        <Suspense
          fallback={<p className="font-sans text-sm text-ink-soft">加载中…</p>}
        >
          <TenantOverview handle={handle} userId={userId} />
        </Suspense>
      </div>
    </main>
  );
}
