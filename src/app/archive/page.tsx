/**
 * 文件：src/app/archive/page.tsx
 * 描述：归档页：按年 / 月回看全部已发布日志（年份锚点可分享），条目只给日期、标题与项目
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。大厅解决"筛"，归档解决"按时间回看"：
 *               年份一个区块、月份一个小标题，条目行只到标题粒度；分组与排序口径在 getArchive 单源
 * - 2026-11-16: 评审 G5：条目 >30 时年份下方加年份跳转条（阈值与判据在 archive.ts，默认不显示）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getArchive } from "@/lib/logs";
import { shouldShowYearBar } from "@/lib/archive";
import { PageHeader } from "@/components/SectionHead";

export const metadata: Metadata = {
  title: "归档",
  description:
    "按年月回看全部已发布日志：每一条都记着判断时间与发布时间，可用日期定位。",
};

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验，不改变渲染方式
export const instant = false;

export default async function ArchivePage() {
  const years = await getArchive();
  const total = years.reduce((sum, year) => sum + year.count, 0);

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-16 max-md:py-10">
      <PageHeader eyebrow="ARCHIVE" meta={`共 ${total} 条已发布 · ${years.length} 个年份`} title="归档"
        lede="按年月回看：每一条都记着「哪天做的决策」，而不是「哪天写完的」。" />

      {years.length === 0 ? (
        <p className="mt-10 border-t border-ink py-6 font-sans text-sm text-ink-soft">
          还没有已发布日志
        </p>
      ) : (
        <div className="mt-12 space-y-16">
          {shouldShowYearBar(total) && (
            <nav
              aria-label="按年份跳转"
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-hairline py-3"
            >
              <span className="font-mono text-[10px] tracking-[0.16em] text-ink-soft">
                YEAR
              </span>
              {years.map((year) => (
                <a
                  key={year.year}
                  href={`#${year.year}`}
                  className="border-b border-transparent font-mono text-xs text-ink-soft hover:border-ink hover:text-ink"
                >
                  {year.year}{" "}
                  <span className="text-xs text-ink-soft">{year.count}</span>
                </a>
              ))}
            </nav>
          )}
          {years.map((year) => (
            <section key={year.year} id={year.year} className="scroll-mt-8">
              <div className="flex items-baseline justify-between border-b border-ink pb-2">
                <h2 className="font-mono text-2xl tracking-[0.08em] text-ink">
                  {year.year}
                </h2>
                <span className="font-mono text-xs text-ink-soft">
                  {year.count} 条
                </span>
              </div>

              {year.months.map((month) => (
                <div key={month.key} className="mt-8">
                  <p className="font-mono text-xs tracking-[0.16em] text-ink-soft">
                    {month.key}
                  </p>
                  <ul className="mt-3 border-t border-hairline">
                    {month.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-3"
                      >
                        <span className="font-mono text-xs text-ink-soft">
                          {item.beforeDate.toISOString().slice(0, 10)}
                        </span>
                        <Link
                          href={`/u/${item.handle}/logs/${item.slug}`}
                          className="text-base hover:underline hover:decoration-1 hover:underline-offset-4"
                        >
                          {item.title}
                        </Link>
                        <span className="ml-auto font-sans text-xs text-ink-soft">
                          {item.projectName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <p className="mt-16 flex flex-wrap gap-6">
        <Link
          href="/logs"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          全部日志 →
        </Link>
        <Link
          href="/tags"
          className="border-b border-ink font-sans text-xs text-ink"
        >
          按标签看 →
        </Link>
      </p>
    </main>
  );
}
