/**
 * 文件：src/app/admin/page.tsx
 * 描述：后台概览：项目、已发布、草稿三项存量；继续处理草稿；同步与导出动作
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: 最近动态加编辑链接、底部加新建日志入口（Phase 4，经批准改本清单外文件）
 * - 2026-11-02: 补 instant 注释说明（false 是退出即时导航校验，不改变渲染方式）
 * - 2026-11-03: 接收 ?deleted=1，删除后回概览时给出结果提示
 * - 2026-11-04: 概览状态横幅补 role=alert（D27）
 * - 2026-11-05: 三项计数、区块标题与列表状态标签中文化（不译数据，isPublished 判定未动）；中文标签去 font-mono 与 0.2em 字距，计数值与带日期的状态格仍用 font-mono
 * - 2026-11-05: 状态格拆成两层 span——「已发布/草稿」走 font-sans、日期走 font-mono（时间戳强制等宽），外层只留 ml-auto 与字号色
 * - 2026-11-06: 空态 NO LOG YET 改「暂无日志」并去 font-mono（中文标签走 Inter）
 * - 2026-11-06: 第三批去英文——DELETED 横幅去掉英文前缀，中文句自解释；?deleted= 参数名与 errorCodeChip 未动
 * - 2026-11-09: V2.0 Step 4-B：概览取数带 session.userId（布局的会话检查不阻塞页面并行渲染，
 *               本页自查会话后再查库），三项计数与最近动态只统计本租户
 * - 2026-11-10: V2.0 Step 5 Commit 3：概览加 [ 从 GitHub 同步 ] 按钮与结果横幅（?synced/skipped/SYNC_001）
 * - 2026-11-12: F25：概览加 [ 导出所有数据 ] 下载入口（与同步按钮同一行）与 EXPORT_001 横幅
 * - 2026-11-12: F25 收口：导出入口由客户端按钮（动作返回 Response）改为锚点指向 /admin/export
 *               路由处理器——动作返回值走 RSC 序列化通道无法承载 Response，按官方下载范例改
 * - 2026-11-13: Phase C 概览重排：标题区补「新建日志」主入口；三项计数改卡片；
 *               「最近动态」改「继续处理」只列草稿（getAdminOverview 同步改 recentDrafts），
 *               同步/导出/项目入口收进「数据与发布」区；横幅与动作语义未动
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { syncGithubAction } from "@/app/admin/sync-actions";
import { requireAdminSession } from "@/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { errorTextOf } from "@/lib/error-text";
import { pickParam } from "@/lib/forms";
import { getAdminOverview } from "@/lib/projects";

// 概览统计走未缓存查询，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type AdminHomePageProps = {
  searchParams: Promise<{
    deleted?: string | string[];
    synced?: string | string[];
    skipped?: string | string[];
    error?: string | string[];
  }>;
};

export default async function AdminHomePage({
  searchParams,
}: AdminHomePageProps) {
  const query = await searchParams;
  const deleted = pickParam(query.deleted);
  const synced = pickParam(query.synced);
  const skipped = pickParam(query.skipped);
  const errorCode = pickParam(query.error);
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const { projectCount, publishedCount, draftCount, recentDrafts } =
    await getAdminOverview(session.userId);

  const stats = [
    { label: "项目总数", value: projectCount },
    { label: "已发布", value: publishedCount },
    { label: "草稿", value: draftCount },
  ];

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            OVERVIEW
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">概览</h1>
        </div>
        <Link
          href="/admin/logs/new"
          className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
        >
          新建日志
        </Link>
      </header>

      {deleted && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          该条日志已彻底删除，正文与摘要都不再保留
        </p>
      )}

      {synced !== undefined && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          成功同步 {synced} 条，跳过 {skipped ?? 0} 条
        </p>
      )}

      {errorCode === "SYNC_001" && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          请先退出并重新登录以绑定 GitHub 授权
        </p>
      )}

      {errorCode === "EXPORT_001" && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          导出失败，请稍后重试
        </p>
      )}

      {errorCode && errorCode !== "SYNC_001" && errorCode !== "EXPORT_001" && (
        <p
          role="alert"
          className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink"
        >
          {errorCode} · {errorTextOf(errorCode, "log")}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="border border-hairline p-4">
            <p className="font-sans text-[10px] text-ink-soft">{item.label}</p>
            <p className="mt-2 font-mono text-3xl leading-none text-ink">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-sans text-[10px] text-ink-soft">继续处理</h2>
          <Link
            href="/admin/logs?status=draft"
            className="border-b border-ink font-sans text-[11px] text-ink"
          >
            全部草稿 →
          </Link>
        </div>

        {recentDrafts.length === 0 ? (
          <p className="mt-4 border-t border-ink py-6 font-sans text-xs text-ink-soft">
            暂无草稿
          </p>
        ) : (
          <ul className="mt-4 border-t border-ink">
            {recentDrafts.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
              >
                <span aria-hidden className="font-mono text-[10px] text-ink">
                  ○
                </span>
                <span className="min-w-0 flex-1 text-base">{log.title}</span>
                <span className="font-mono text-[11px] text-ink-soft">
                  {log.project.name}
                </span>
                <span className="ml-auto text-[11px] text-ink-soft">
                  <span className="font-sans">草稿 · </span>
                  <span className="font-mono">
                    {log.updatedAt.toISOString().slice(0, 10)}
                  </span>
                </span>
                <Link
                  href={`/admin/logs/${log.id}/edit`}
                  className="border-b border-ink font-sans text-[11px] text-ink"
                >
                  编辑
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t border-hairline pt-6">
        <h2 className="font-sans text-[10px] text-ink-soft">数据与发布</h2>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-4">
          <form action={syncGithubAction} className="inline">
            <SubmitButton
              label="从 GitHub 同步"
              pendingLabel="同步中…"
              className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
            />
          </form>
          <a
            href="/admin/export"
            className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
          >
            导出所有数据
          </a>
          <Link
            href="/admin/projects"
            className="border-b border-ink font-sans text-[11px] text-ink"
          >
            管理项目 →
          </Link>
        </div>
        <p className="mt-4 max-w-xl font-sans text-[11px] leading-relaxed text-ink-soft">
          同步会拉取公开仓库的提交生成草稿，挂在 github-sync 项目下；导出包含当前账号全部项目与日志（含草稿）。
          草稿对外不可见，发布后前台立即可见。
        </p>
      </section>
    </>
  );
}
