/**
 * 文件：src/app/u/[handle]/page.tsx
 * 描述：租户主页：该用户的档案看板与最新已发布日志（UI 复用首页两栏结构，数据源传入 handle）
 * 作者：张磊
 * 创建日期：2026-11-09
 * 修改记录：
 * - 2026-11-09: V2.0 Step 3 阶段一：创建。handle 不存在（库里无对应用户）走 notFound；
 *               看板与最新日志均按该租户 userId 取数（裁定 ① 的租户公开视图）；
 *               精选/看板/日志三处的跳转链接带本页 handle（/u/[handle]/... 体系）
 * - 2026-11-13: 本轮升级：精选改调 pickFeatured（原先只 filter + slice，实际按最近更新取，
 *               与首页「日志数优先」并不一致）；同时给本页补上 canonical 与 OG（原先只有 title）
 * - 2026-11-16: 重构 B2：标题 36/48 → 32px、副标 18 → 15px、头部加 ink 收边线（与首页/作品页同一写法）；
 *               统计条本批未加（会吃掉软著材料后窗口余量，已只剩 105 行），留待 B2 收尾时连同统计口径一起做
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StatusBoard } from "@/components/StatusBoard";
import { Timeline } from "@/components/Timeline";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { getLatestLogs } from "@/lib/logs";
import { getArchiveBoard, pickFeatured, resolveUserId } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

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

  const description = `${handle} 的数字档案：档案看板与最新开发日志。`;

  return {
    title: handle,
    description,
    alternates: { canonical: `/u/${handle}` },
    openGraph: {
      type: "profile",
      title: `${handle} · 数字档案`,
      description,
      url: `${siteUrl()}/u/${handle}`,
    },
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

  // 精选规则与首页同口径：从 pickFeatured 单源取（原先是 filter + slice，实际按最近更新取）
  const featured = pickFeatured(board);

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
      <header className="border-b border-ink pb-8">
        <h1 className="text-[32px] font-medium tracking-tight">
          {handle}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
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
