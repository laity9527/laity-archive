/**
 * 文件：src/app/feed.json/route.ts
 * 描述：JSON Feed 1.1 订阅出口：与 /feed.xml 同一份数据与摘要口径，供现代阅读器/自动化消费
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。与 RSS 并列：同一 FEED_LIMIT、同一条 getLatestLogs
 *               （publishedAt not null），摘要复用 rss.ts 的 toPlainText；不写 connection()/dynamic，
 *               与 feed.xml 同构（cacheComponents 下 GET 默认请求期运行，查库即终止预渲染）
 */
import { getLatestLogs } from "@/lib/logs";
import { toPlainText } from "@/lib/rss";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const FEED_LIMIT = 20;

type LatestLog = Awaited<ReturnType<typeof getLatestLogs>>[number];

function withPublishedAt(log: LatestLog): log is LatestLog & { publishedAt: Date } {
  return log.publishedAt !== null;
}

export async function GET() {
  const base = siteUrl();
  const logs = (await getLatestLogs(FEED_LIMIT)).filter(withPublishedAt);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: siteName,
    home_page_url: base,
    feed_url: `${base}/feed.json`,
    description: siteDescription,
    language: "zh-CN",
    items: logs.map((log) => {
      const url = `${base}/u/${log.user.handle}/logs/${log.slug}`;

      return {
        // id 用永久链接：slug 与 handle 都不变，重发也不会产生新条目
        id: url,
        url,
        title: log.title,
        // 摘要口径与 RSS / 详情页一致：经验总结优先，缺则取 BEFORE 正文
        content_text: toPlainText(log.lessonLearned?.trim() || log.beforeContent),
        date_published: log.publishedAt.toISOString(),
        tags: log.tags,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
    },
  });
}
