/**
 * 文件：src/app/robots.ts
 * 描述：生成 /robots.txt：放行公开内容，屏蔽后台与登录页，并指向 sitemap
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 */
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 后台与登录页没有公开价值，且会暴露 callbackUrl 参数形态
      disallow: ["/admin", "/login"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
