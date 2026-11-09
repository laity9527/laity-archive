/**
 * 文件：src/app/projects/page.tsx
 * 描述：作品维度入口：列出全部项目，含类型、状态、简介与已发布日志数（草稿不计数）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5a 初始创建
 * - 2026-11-02: 更正 instant 注释：false 是退出即时导航校验，不是把路由改成动态
 * - 2026-11-03: 补页面标题与描述；正文容器加 id 供"跳到正文"使用
 * - 2026-11-06: 全站去英文第一批——kind/status 与 LOGS 改走 src/lib/labels.ts 映射、空态 NO PROJECT YET 改「暂无项目」；
 *               按视觉铁律新口径拆字体：slug 留 font-mono（英文标识），中文与量词走 font-sans，日期留 font-mono
 * - 2026-11-09: V2.0 Step 3 阶段一：作品页仍是全局维度入口（与 /logs 大厅同口径），
 *               详情链接改 /u/[handle]/projects/[slug]——handle 经 listPublicProjects 的 select 白名单带出（公开标识）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { listPublicProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "作品档案",
  description:
    "按作品维度归档：每个项目的类型、状态、简介，以及它下面已发布的开发复盘条数。",
};

// 项目列表走未缓存查询，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

export default async function ProjectsPage() {
  const projects = await listPublicProjects();

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 首页
      </Link>
      <h1 className="mt-8 text-4xl font-medium tracking-tight">项目</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        按作品维度看档案：一个项目下的判断与验证，都收在同一页里。
      </p>

      {projects.length === 0 ? (
        <p className="mt-12 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          暂无项目
        </p>
      ) : (
        <ul className="mt-12 border-t border-ink">
          {projects.map((project) => (
            <li
              key={project.slug}
              className="flex flex-col gap-4 border-b border-hairline py-8 md:flex-row md:items-baseline md:gap-8"
            >
              <span aria-hidden className="font-mono text-[10px] text-ink">
                {project.status === "LIVE" ? "●" : "○"}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-medium">
                  <Link
                    href={`/u/${project.user.handle}/projects/${project.slug}`}
                    className="hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {project.name}
                  </Link>
                </h2>
                <p className="mt-2 text-[11px] text-ink-soft">
                  <span className="font-mono tracking-[0.1em]">{project.slug}</span>
                  <span className="font-sans">{` · ${kindLabel(project.kind)} · ${statusLabel(project.status)}`}</span>
                </p>
                {project.summary && (
                  <p className="mt-3 max-w-xl text-sm text-ink-soft">
                    {project.summary}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-ink-soft md:text-right">
                <span className="font-sans">
                  {logsCountLabel(project.logs.length)}
                </span>
                {project.logs.length > 0 && (
                  <span className="font-mono">{` · ${project.logs[0].beforeDate.toISOString().slice(0, 10)}`}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-16">
        <Link href="/logs" className="border-b border-ink text-sm">
          全部日志 →
        </Link>
      </p>
    </main>
  );
}
