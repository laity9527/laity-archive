/**
 * 文件：src/lib/published-snapshot.ts
 * 描述：上次发布快照的形状与解析：发布时写入，编辑页/快照页读取时先过一遍类型校验
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G8）。JSON 列没有 schema 约束，读取端必须自己挡脏值；
 *               解析失败返回 null（页面按“没有快照”处理），不把半截对象送进渲染器
 */

export type PublishedSnapshot = {
  title: string;
  beforeContent: string;
  afterContent: string | null;
  lessonLearned: string | null;
  tags: string[];
  series: string | null;
  contentHash: string;
  publishedAt: string;
};

/** 只认自己有把握的字段：标题/正文/摘要/发布时间是硬性，其余缺失按空值处理。 */
export function parsePublishedSnapshot(value: unknown): PublishedSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.title !== "string" ||
    typeof raw.beforeContent !== "string" ||
    typeof raw.contentHash !== "string" ||
    typeof raw.publishedAt !== "string"
  ) {
    return null;
  }

  const series = typeof raw.series === "string" && raw.series.trim() ? raw.series : null;

  return {
    title: raw.title,
    beforeContent: raw.beforeContent,
    afterContent: typeof raw.afterContent === "string" ? raw.afterContent : null,
    lessonLearned:
      typeof raw.lessonLearned === "string" ? raw.lessonLearned : null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    series,
    contentHash: raw.contentHash,
    publishedAt: raw.publishedAt,
  };
}
