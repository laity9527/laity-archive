/**
 * 文件：src/app/tags/[tag]/feed.json/route.ts
 * 描述：标签订阅源（JSON Feed 1.1）：与 /tags/[tag]/feed.xml 同数据同口径
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。RSS 版已有，JSON 版补齐"同一标签两种订阅格式"；
 *               标签非法或无已发布日志回 404（与 XML 版一致，不产出永远为空的源）；
 *               解码/归一化复用 forms.ts，取数与摘要复用 getTagFeedItems / toPlainText
 */
import { decodeTagParam, normalizeTag } from "@/lib/forms";
import { getTagFeedItems, hasPublishedTag } from "@/lib/logs";
import { toPlainText } from "@/lib/rss";
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
  const tagPath = `${base}/tags/${encodeURIComponent(tag)}`;
  const items = await getTagFeedItems(tag);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${siteName} · 标签：${tag}`,
    home_page_url: tagPath,
    feed_url: `${tagPath}/feed.json`,
    description: `${siteName} 中标记为「${tag}」的已发布开发复盘。`,
    language: "zh-CN",
    items: items.map((item) => {
      const url = `${base}/u/${item.handle}/logs/${item.slug}`;

      return {
        // 与全站 JSON Feed 同口径：id 用永久链接
        id: url,
        url,
        title: item.title,
        content_text: toPlainText(item.summary),
        date_published: item.publishedAt.toISOString(),
        tags: item.tags,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
    },
  });
}
