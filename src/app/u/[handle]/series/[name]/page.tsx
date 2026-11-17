/**
 * 文件：src/app/u/[handle]/series/[name]/page.tsx
 * 描述：系列页：同一作者同一系列的已发布日志，按决策时间升序，标出第 n/m 篇
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 / G2）。不建系列表：series 字段同名即同系列；
 *               系列页是“按写作计划读”的入口，排序与详情页的“第 n/m 篇”共用 beforeDate 升序口径。
 *               空系列由 Proxy 前置判定 404（与日志/项目/标签同口径）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { decodeTagParam } from "@/lib/forms";
import { getSeriesLogs } from "@/lib/logs";

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验
export const instant = false;

type SeriesPageProps = {
  params: Promise<{ handle: string; name: string }>;
};

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const { handle, name } = await params;
  const series = decodeTagParam(name).trim();

  return {
    title: series ? `系列：${series}` : "系列",
    description: `${handle} 的系列「${series}」：按决策时间顺序阅读。`,
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { handle, name } = await params;
  const series = decodeTagParam(name).trim();
  const rows = series ? await getSeriesLogs(series, handle) : [];

  if (rows.length === 0) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header className="border-b border-ink pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">
            SERIES
          </span>
          <span className="font-sans text-xs text-ink-soft">
            {handle} · 共 <span className="font-mono">{rows.length}</span> 篇
          </span>
        </p>
        <h1 className="mt-3 text-[32px] font-medium tracking-tight">
          {series}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          按决策时间排序：先读到的前提，后面的判断才成立。
        </p>
      </header>

      <ol className="mt-12 border-t border-ink">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
          >
            <span className="font-mono text-[11px] text-ink-soft">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[11px] text-ink-soft">
              {row.beforeDate.toISOString().slice(0, 10)}
            </span>
            <Link
              href={`/u/${handle}/logs/${row.slug}`}
              className="min-w-0 text-base hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              {row.title}
            </Link>
            <span className="ml-auto font-sans text-xs text-ink-soft">
              {row.project.name}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-16 flex flex-wrap gap-6">
        <Link
          href={`/u/${handle}`}
          className="border-b border-ink font-sans text-xs text-ink"
        >
          ← 该租户的日志
        </Link>
        <Link
          href="/logs"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          全部日志 →
        </Link>
      </p>
    </main>
  );
}
