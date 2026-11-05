/**
 * 文件：src/app/admin/page.tsx
 * 描述：后台概览：项目数、已发布与草稿日志数、最近改动的 5 条日志
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: 最近动态加编辑链接、底部加新建日志入口（Phase 4，经批准改本清单外文件）
 * - 2026-11-02: 补 instant 注释说明（false 是退出即时导航校验，不改变渲染方式）
 * - 2026-11-03: 接收 ?deleted=1，删除后回概览时给出结果提示
 * - 2026-11-04: 概览状态横幅补 role=alert（D27）
 * - 2026-11-05: 三项计数、区块标题与列表状态标签中文化（不译数据，isPublished 判定未动）；中文标签去 font-mono 与 0.2em 字距，计数值与带日期的状态格仍用 font-mono
 */
import Link from "next/link";
import { pickParam } from "@/lib/forms";
import { getAdminOverview } from "@/lib/projects";

// 概览统计走未缓存查询，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type AdminHomePageProps = {
  searchParams: Promise<{ deleted?: string | string[] }>;
};

export default async function AdminHomePage({
  searchParams,
}: AdminHomePageProps) {
  const query = await searchParams;
  const deleted = pickParam(query.deleted);
  const { projectCount, publishedCount, draftCount, recentLogs } =
    await getAdminOverview();

  const stats = [
    { label: "项目总数", value: projectCount },
    { label: "已发布", value: publishedCount },
    { label: "草稿", value: draftCount },
  ];

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">概览</h1>

      {deleted && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          DELETED · 该条日志已彻底删除，正文与摘要都不再保留
        </p>
      )}

      <ul className="mt-10 border-t border-ink">
        {stats.map((item) => (
          <li
            key={item.label}
            className="flex items-baseline justify-between border-b border-hairline py-4"
          >
            <span className="font-sans text-[11px] text-ink-soft">
              {item.label}
            </span>
            <span className="font-mono text-2xl text-ink">{item.value}</span>
          </li>
        ))}
      </ul>

      <section className="mt-16">
        <h2 className="font-sans text-[10px] text-ink-soft">最近动态</h2>
        {recentLogs.length === 0 ? (
          <p className="mt-4 border-t border-ink py-6 font-mono text-xs text-ink-soft">
            NO LOG YET
          </p>
        ) : (
          <ul className="mt-4 border-t border-ink">
            {recentLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
              >
                <span aria-hidden className="font-mono text-[10px] text-ink">
                  {log.isPublished ? "●" : "○"}
                </span>
                <span className="text-base">{log.title}</span>
                <span className="font-mono text-[11px] text-ink-soft">
                  {log.project.name}
                </span>
                <span className="ml-auto font-mono text-[11px] text-ink-soft">
                  {log.isPublished ? "已发布" : "草稿"} ·{" "}
                  {log.updatedAt.toISOString().slice(0, 10)}
                </span>
                <Link
                  href={`/admin/logs/${log.id}/edit`}
                  className="border-b border-ink font-mono text-[11px] text-ink"
                >
                  编辑
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 font-mono text-[11px] text-ink-soft">
          <Link href="/admin/logs/new" className="border-b border-ink text-ink">
            新建日志
          </Link>
          <span className="ml-4">草稿对外不可见，发布后前台立即可见</span>
        </p>
      </section>

      <p className="mt-16">
        <Link href="/admin/projects" className="border-b border-ink text-sm">
          去管理项目 →
        </Link>
      </p>
    </>
  );
}

