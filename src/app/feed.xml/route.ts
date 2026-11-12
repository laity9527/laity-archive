/**
 * 文件：src/app/feed.xml/route.ts
 * 描述：RSS 2.0 订阅出口：请求期取最新 20 篇已发布日志，组装 feed XML 响应（F27）
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F27 RSS 订阅 Commit 2：路由 + head 自动发现。不写 connection()/use cache/dynamic——
 *               cacheComponents 下 GET 默认请求期运行，查库即终止预渲染（官方文档实证），与 export route 同构；
 *               空库返 200 空 channel，异常走框架 500 不造错误码）
 */
import { getLatestLogs } from "@/lib/logs";
import { buildRssXml, toPlainText } from "@/lib/rss";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const FEED_LIMIT = 20;

// getLatestLogs 的 where 已带 publishedAt: { not: null }（D13 口径），谓词只做类型收窄
type LatestLog = Awaited<ReturnType<typeof getLatestLogs>>[number];

function withPublishedAt(log: LatestLog): log is LatestLog & { publishedAt: Date } {
  return log.publishedAt !== null;
}

export async function GET() {
  const base = siteUrl();
  const logs = (await getLatestLogs(FEED_LIMIT)).filter(withPublishedAt);

  const xml = buildRssXml(
    {
      title: siteName,
      link: base,
      description: siteDescription,
      language: "zh-cn",
      lastBuildDate: logs[0]?.publishedAt ?? null,
    },
    logs.map((log) => ({
      title: log.title,
      link: `${base}/u/${log.user.handle}/logs/${log.slug}`,
      pubDate: log.publishedAt,
      // 摘要优先级与详情页 describeLog 同口径：经验总结优先，缺则取 BEFORE 正文
      description: toPlainText(log.lessonLearned?.trim() || log.beforeContent),
      categories: log.tags,
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
