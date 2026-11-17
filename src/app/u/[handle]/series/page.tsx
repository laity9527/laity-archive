/**
 * 文件：src/app/u/[handle]/series/page.tsx
 * 描述：系列索引：列出该租户全部已发布系列与篇数，链到各系列页
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G2 补）。系列页解决“读一个系列”，索引解决“有哪些系列”；
 *               只按 series 分组计数，不建系列表；空索引由 Proxy 前置判定 404
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesIndex } from "@/lib/logs";

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验
export const instant = false;

type SeriesIndexPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: SeriesIndexPageProps): Promise<Metadata> {
  const { handle } = await params;

  return {
    title: "系列",
    description: `${handle} 的全部系列：按决策时间顺序阅读成组的日志。`,
  };
}

export default async function SeriesIndexPage({
  params,
}: SeriesIndexPageProps) {
  const { handle } = await params;
  const series = await getSeriesIndex(handle);

  if (series.length === 0) {
    notFound();
  }

  const total = series.reduce((sum, item) => sum + item.count, 0);

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header className="border-b border-ink pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">
            SERIES INDEX
          </span>
          <span className="font-sans text-xs text-ink-soft">
            {handle} · {series.length} 个系列 · {total} 篇
          </span>
        </p>
        <h1 className="mt-3 text-[32px] font-medium tracking-tight">系列</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          按写作计划读，而不是按发布时间读：先读到的前提，后面的判断才成立。
        </p>
      </header>

      <ul className="mt-12 border-t border-ink">
        {series.map((item) => (
          <li
            key={item.name}
            className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
          >
            <Link
              href={`/u/${handle}/series/${encodeURIComponent(item.name)}`}
              className="min-w-0 text-base hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              {item.name}
            </Link>
            <span className="ml-auto font-mono text-[11px] text-ink-soft">
              {item.count} 篇
            </span>
          </li>
        ))}
      </ul>

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
