/**
 * 文件：src/lib/sitemap-data.ts
 * 描述：站点地图取数：公开路由 + 全部已发布日志 + 全部项目，草稿永不进入
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 * - 2026-11-03: 公开路由清单加 /privacy（隐私与数据说明页）
 * - 2026-11-03: 公开路由清单加 /licenses（开源许可与致谢页）
 */
import { connection } from "next/server";
import { getSafeLogs } from "@/lib/logs";
import { listPublicProjects } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
};

// 内容随发布动作变化，sitemap 必须请求期取数；Cache Components 下要先用 connection() 声明
// "到这里停止预渲染"，否则构建期会因未缓存查询报错
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  await connection();

  const base = siteUrl();
  const [logs, projects] = await Promise.all([getSafeLogs(), listPublicProjects()]);

  return [
    { url: `${base}/` },
    { url: `${base}/logs` },
    { url: `${base}/projects` },
    { url: `${base}/privacy` },
    { url: `${base}/licenses` },
    ...logs.map((log) => ({
      url: `${base}/logs/${log.slug}`,
      lastModified: log.updatedAt,
    })),
    ...projects.map((project) => ({
      url: `${base}/projects/${project.slug}`,
      lastModified: project.createdAt,
    })),
  ];
}
