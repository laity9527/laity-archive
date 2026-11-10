/**
 * 文件：src/lib/token-crypto.ts
 * 描述：GitHub access_token 的落库加密：AES-256-GCM，密钥只读 ENCRYPTION_KEY 环境变量，缺失即抛错
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 1：同步引擎要拿 token 调 GitHub API，明文不落库）
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 64 位 hex = 32 字节，恰为 AES-256 密钥长度；缺失或形态不对一律抛错，不回退、不用默认值
function readKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? "";

  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("ENCRYPTION_KEY 缺失或不是 64 位 hex（本条不含任何值）");
  }

  return Buffer.from(raw, "hex");
}

// 密文三段：base64(iv).base64(authTag).base64(ciphertext)。
// base64 字母表不含点，三段拼接无歧义；IV 每次随机 12 字节，同明文两次加密产物不同
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptToken(token: string): string {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("密文形态不合法（本条不含任何值）");
  }

  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64"));

  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("密文形态不合法（本条不含任何值）");
  }

  const decipher = createDecipheriv("aes-256-gcm", readKey(), iv);
  decipher.setAuthTag(tag);

  // GCM 认证标签在 final() 校验：密文、标签、IV 任何一段被篡改都会在这里抛错
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}