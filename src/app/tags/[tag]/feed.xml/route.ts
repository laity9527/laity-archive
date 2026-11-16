/**
 * 文件：src/app/tags/[tag]/feed.xml/route.ts
 * 描述：标签订阅源：同标签下的已发布日志 RSS（与全站 /feed.xml 同一套组装与摘要口径）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。标签页已有聚合视图，缺"订阅"这一半：
 *               本路由让每个标签都能单独订阅。标签非法或没有已发布日志时回 404（不返回空 feed，
 *               避免阅读器里出现一个永远空的源）；解码与归一化复用 forms.ts，与 proxy 的前置判定同口径
 */
import { decodeTagParam, normalizeTag } from "@/lib/forms";
import { getTagFeedItems, hasPublishedTag } from "@/lib/logs";
import { buildRssXml, toPlainText } from "@/lib/rss";
import { siteName, siteUrl } from "@/lib/site";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tag: string }> },
) {
  const { tag: raw } = await params;
  const tag = normalizeTag(decodeTagParam(raw));

  if (!tag || !(await hasPublishedTag(tag))) {
    return new Response("Not Found", { status: 404 });
  }

  const base = siteUrl();
  const items = await getTagFeedItems(tag);

  const xml = buildRssXml(
    {
      title: `${siteName} · 标签：${tag}`,
      link: `${base}/tags/${encodeURIComponent(tag)}`,
      description: `${siteName} 中标记为「${tag}」的已发布开发复盘。`,
      language: "zh-cn",
      lastBuildDate: items[0]?.publishedAt ?? null,
    },
    items.map((item) => ({
      title: item.title,
      link: `${base}/u/${item.handle}/logs/${item.slug}`,
      pubDate: item.publishedAt,
      description: toPlainText(item.summary),
      categories: item.tags,
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
