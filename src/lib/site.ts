/**
 * 文件：src/lib/site.ts
 * 描述：站点对外标识的单源：正式域名（供 metadata、sitemap、robots 使用）与站点文案
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建，收拢此前散落的站点名与描述
 */

// NEXTAUTH_URL 在开发（http://localhost:3000）与生产（https://<正式域名>）两套环境里
// 都必须是本站对外地址，GitHub 回调也依赖它，所以这里复用它而不是新增环境变量：
// 多一个 SITE_URL 就多一处"改了 A 忘了 B"的漂移点
const configured = process.env.NEXTAUTH_URL?.trim();

export const siteName = "Laity 项目档案库";
export const siteDescription =
  "厂牌官网与开发复盘证据链：每一次判断都带着时间戳与内容摘要存证。";

export function siteUrl(): string {
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}
