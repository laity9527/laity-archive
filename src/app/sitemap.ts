/**
 * 文件：src/app/sitemap.ts
 * 描述：生成 /sitemap.xml：站点公开路由与全部已发布内容，草稿不进入
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建，取数集中在 src/lib/sitemap-data.ts
 */
import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/sitemap-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();

  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
  }));
}
