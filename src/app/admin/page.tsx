/**
 * 文件：src/app/admin/page.tsx
 * 描述：后台概览：项目数、已发布与草稿日志数、最近改动的 5 条日志
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import Link from "next/link";
import { getAdminOverview } from "@/lib/projects";

export const instant = false;

export default async function AdminHomePage() {
  const { projectCount, publishedCount, draftCount, recentLogs } =
    await getAdminOverview();

  const stats = [
    { label: "PROJECTS", value: projectCount },
    { label: "PUBLISHED", value: publishedCount },
    { label: "DRAFTS", value: draftCount },
  ];

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">概览</h1>

      <ul className="mt-10 border-t border-ink">
        {stats.map((item) => (
          <li
            key={item.label}
            className="flex items-baseline justify-between border-b border-hairline py-4"
          >
            <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">
              {item.label}
            </span>
            <span className="font-mono text-2xl text-ink">{item.value}</span>
          </li>
        ))}
      </ul>

      <section className="mt-16">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          RECENT ACTIVITY
        </h2>
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
                  {log.isPublished ? "PUBLISHED" : "DRAFT"} ·{" "}
                  {log.updatedAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 font-mono text-[11px] text-ink-soft">
          日志编辑与发布在 Phase 4 接入，这里先只读。
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
