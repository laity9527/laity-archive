/**
 * 文件：src/lib/site.ts
 * 描述：站点对外标识的单源：正式域名（供 metadata、sitemap、robots 使用）与站点文案
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建，收拢此前散落的站点名与描述
 * - 2026-11-03: 补 siteIcp()：ICP 备案号走环境变量，未备案时页脚不出该行（上线合规位）
 * - 2026-11-03: 站点描述去掉"存证"口吻，改为可核对的技术事实；补 sitePoliceIcp() 与 siteContactEmail()
 */

// NEXTAUTH_URL 在开发（http://localhost:3000）与生产（https://<正式域名>）两套环境里
// 都必须是本站对外地址，GitHub 回调也依赖它，所以这里复用它而不是新增环境变量：
// 多一个 SITE_URL 就多一处"改了 A 忘了 B"的漂移点
export const siteName = "Laity 项目档案库";
export const siteDescription =
  "厂牌官网与开发复盘档案：每条日志都记发布时间与正文 SHA-256 摘要，可核对内容是否被改动。";

// 刻意在调用时读环境变量，不在模块加载时捕获：一是让回归测试能确定性地覆盖
// "已配置"与"未配置"两个分支（CI 的作业级 env 会设这个变量，模块级捕获会让用例随环境飘红），
// 二是本模块只在服务端求值，每次读的成本可以忽略
export function siteUrl(): string {
  const configured = process.env.NEXTAUTH_URL?.trim();

  return configured ? configured.replace(/\/+$/, "") : "http://localhost:3000";
}

// 备案号只在服务端读取，作为 prop 传给页脚组件——页脚是客户端组件，
// 直接 import 本模块会把 process.env 打进浏览器包
function readPublicTextEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

export function siteIcp(): string | null {
  return readPublicTextEnv("SITE_ICP");
}

// 公安联网备案号（取得后才填；未设置时页脚不出这一行）
export function sitePoliceIcp(): string | null {
  return readPublicTextEnv("SITE_POLICE_ICP");
}

// 对外联系与侵权投诉邮箱。没有公开邮箱就不渲染，禁止拿个人邮箱硬凑
export function siteContactEmail(): string | null {
  return readPublicTextEnv("SITE_CONTACT_EMAIL");
}
