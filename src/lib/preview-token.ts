/**
 * 文件：src/lib/preview-token.ts
 * 描述：公开预览链接的 token 生成、哈希与过期判定（纯函数，node:crypto）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G7，负责人已批准公开预览）。只存 SHA-256 哈希，不存明文；
 *               有效期 24 小时；token 是“持链接者可看”的凭证，不是单次使用凭证——
 *               单次使用会让收件人刷新/换设备就失效，体验代价大于安全收益
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
