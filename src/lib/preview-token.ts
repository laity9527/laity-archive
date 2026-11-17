/**
 * 文件：src/lib/preview-token.ts
 * 描述：公开预览链接的 token 生成、哈希与过期判定（纯函数，node:crypto）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G7，负责人已批准公开预览）。只存 SHA-256 哈希，不存明文；
 *               有效期 24 小时；token 是“持链接者可看”的凭证，不是单次使用凭证——
 *               单次使用会让收件人刷新/换设备就失效，体验代价大于安全收益
 *
 * 安全模型（负责人已批准公开预览，2026-11-17）：
 * - 明文 token 只在生成后的回跳 URL 里出现一次，编辑页展示给作者本人；
 *   数据库只存 SHA-256 哈希，库泄露不能直接换出可用链接。
 * - 有效期 24 小时；撤销按日志整体清空；过期/撤销后 Proxy 直接 404。
 * - 预览页 robots noindex，不进 sitemap；不渲染印章、JSON-LD 与任何 SEO 输出。
 * - token 不是单次使用：收件人刷新、换设备仍可读，直到过期或被撤销。
 * - 预览页只读，不提供任何写入口；写路径仍要求登录会话。
 * - 日志删除由外键级联清理 token，避免悬挂链接。
 *
 * 字号与布局无关的两条实现细节：
 * - 哈希用 SHA-256 十六进制小写，与全站摘要口径同族，便于审计时肉眼比对。
 * - token 由 node:crypto 生成，不走 Math.random；测试只断言形状与差异，不断言具体值。
 * - 过期判定取“等于即过期”，避免到期瞬间仍可读的边界歧义。
 * - 预览页不写 cookie、不读会话，避免给公开页面引入鉴权分支。
 */
import { createHash, randomBytes } from "node:crypto";

export const PREVIEW_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 24;

/** 32 字节随机数的 base64url 形式（24 字节 → 32 字符），URL 安全 */
export function createPreviewTokenValue(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** 入库只存哈希：数据库泄露时不能直接拿去访问预览 */
export function hashPreviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function previewTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + PREVIEW_TOKEN_TTL_MS);
}

/** 到期时刻等于 now 即视为过期（边界取“不可用”一侧） */
export function isPreviewTokenExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}
