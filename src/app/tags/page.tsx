/**
 * 文件：src/app/tags/page.tsx
 * 描述：标签索引页：全部标签按使用频次分三档字号，点击进标签聚合页
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。此前标签只能从日志行点进去，没有总览入口；
 *               本页补上索引，字号按频次分三档（≥5 / 2–4 / 1），排序走 getTagIndex 的单源口径。
 *               不做 tagsKey 双轨迁移，URL 仍用显示名编码（与 /tags/[tag] 现状一致）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getTagIndex } from "@/lib/logs";

export const metadata: Metadata = {
  title: "标签",
  description:
    "按标签横切档案：同一个技术判断，可能散在不同项目与月份里。按使用频次排序，点开即为该标签的日志列表。",
};

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验，不改变渲染方式
export const instant = false;

// 频次三档：一档 20px、二档 16px、三档 14px。字号是唯一变量，不加颜色与字重
function sizeClass(count: number) {
  if (count >= 5) return "text-[20px]";
  if (count >= 2) return "text-[16px]";

  return "text-[14px]";
}

export default async function TagsPage() {
  const tags = await getTagIndex();
  const total = tags.reduce((sum, item) => sum + item.count, 0);

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <header className="border-b border-ink pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">
            TAGS
          </span>
          <span className="font-sans text-xs text-ink-soft">
            {tags.length} 个标签 · 被引用 {total} 次
          </span>
        </p>
        <h1 className="mt-3 text-[32px] font-medium tracking-tight">标签</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          标签是这套档案的横切面：同一个技术判断，可能散在不同的项目与月份里。
        </p>
      </header>

      {tags.length === 0 ? (
        <p className="mt-10 border-t border-ink py-6 font-sans text-sm text-ink-soft">
          还没有标签
        </p>
      ) : (
        <ul className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-5">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className={`${sizeClass(count)} border-b border-transparent hover:border-ink`}
              >
                {tag}
                <span className="ml-2 font-mono text-[10px] text-ink-soft">
                  {count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-16">
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
