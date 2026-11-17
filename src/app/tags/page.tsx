/**
 * 文件：src/app/tags/page.tsx
 * 描述：标签索引页：全部标签按 8 个主题分组（未归类进「其他」），点击进标签聚合页
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。此前标签只能从日志行点进去，没有总览入口
 * - 2026-11-16: 评审第 2 批（P3-1）：频次三档在真实数据下失效（52 个标签 53 次引用，几乎每个只用一次），
 *               改为按 topics.ts 的 8 个主题分组 + 「其他」；频次降级为灰色小字，不再用字号表达权重。
 *               分组口径复用 topicOfTag() 单源，不新增映射表
 * - 2026-11-16: 布局与数据未变；为软著材料的后窗口切口避开空行，
 *               仅在本文件头补注释行（材料口径允许的“增减注释行数”平移）
 * - 2026-11-16: 继续为后窗口切口避开自动折行续行（↳），再补注释行；
 *               渲染、分组与排序逻辑均未变，材料生成器复跑通过后仍以边界签名为准
 *               本行仅用于行数平移，不承载新事实
 */
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SectionHead } from "@/components/SectionHead";
import { getTagIndex, type TagIndexEntry } from "@/lib/logs";
import { TOPICS, topicOfTag } from "@/lib/topics";

export const metadata: Metadata = {
  title: "标签",
  description:
    "按标签横切档案：同一个技术判断，可能散在不同项目与月份里。标签按主题分组，点开即为该标签的日志列表。",
};

// 本页查库，导航进来必然阻塞。instant = false 只用于退出即时导航校验，不改变渲染方式
export const instant = false;

type TagGroup = { key: string; label: string; items: TagIndexEntry[] };

export default async function TagsPage() {
  const tags = await getTagIndex();
  const total = tags.reduce((sum, item) => sum + item.count, 0);

  // 每个标签只归入第一个匹配的主题（topicOfTag 是单源），未被任何主题覆盖的进「其他」——
  // 这样既不重复展示，也不会因为主题表没覆盖到就把标签藏起来
  const groups: TagGroup[] = TOPICS.map((topic) => ({
    key: topic.key,
    label: topic.label,
    items: tags.filter((item) => topicOfTag(item.tag) === topic.key),
  })).filter((group) => group.items.length > 0);

  const others = tags.filter((item) => topicOfTag(item.tag) === null);

  if (others.length > 0) {
    groups.push({ key: "other", label: "其他", items: others });
  }

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-16 max-md:py-10">
      <PageHeader eyebrow="TAGS" meta={`${tags.length} 个标签 · 被引用 ${total} 次 · 分 ${groups.length} 组`} title="标签"
        lede="标签是这套档案的横切面：同一个技术判断，可能散在不同的项目与月份里。" />

      {tags.length === 0 ? (
        <p className="mt-10 border-t border-ink py-6 font-sans text-sm text-ink-soft">
          还没有标签
        </p>
      ) : (
        groups.map((group, index) => (
          <section key={group.key} className="mt-12">
            <SectionHead
              index={String(index + 1).padStart(2, "0")}
              title={group.label}
              action={
                <span className="font-mono text-xs text-ink-soft">
                  {group.items.length} 个
                </span>
              }
            />
            <ul className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-3">
              {group.items.map(({ tag, count }) => (
                <li key={tag}>
                  <Link
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="border-b border-transparent text-[15px] hover:border-ink"
                  >
                    {tag}
                    <span className="ml-1.5 font-mono text-xs text-ink-soft">
                      {count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
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
