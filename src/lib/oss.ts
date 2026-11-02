/**
 * 文件：src/lib/oss.ts
 * 描述：阿里云 OSS 图片上传封装：校验类型与大小后以 PutObject 写入 logs/ 前缀，返回公共读直链
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5b 初始创建。密钥只从环境变量读取；对象名完全由服务端生成，不使用上传文件名
 * - 2026-11-02: 删掉零引用的 isSupportedImage()，类型判定统一走 EXT_BY_MIME 查表
 */
import { randomBytes } from "node:crypto";
import OSS from "ali-oss";

// SPEC IMG_001：仅 jpg/png/webp/gif，且不超过 5MB
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadImageResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; code: "IMG_001" };

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`缺少环境变量 ${name}，无法上传图片`);
  }

  return value;
}

// 对象键只用服务端生成的字符集，避免把用户文件名拼进路径（防目录穿越与奇字符）
function buildObjectKey(ext: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  return `logs/${year}-${month}/${stamp}-${randomBytes(6).toString("hex")}.${ext}`;
}

export async function uploadImage(file: File): Promise<UploadImageResult> {
  const ext = EXT_BY_MIME[file.type];

  if (!ext) {
    return { ok: false, code: "IMG_001" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    return { ok: false, code: "IMG_001" };
  }

  const region = requireEnv("OSS_REGION");
  const bucket = requireEnv("OSS_BUCKET");
  const client = new OSS({
    region,
    bucket,
    accessKeyId: requireEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requireEnv("OSS_ACCESS_KEY_SECRET"),
    secure: true,
  });

  const key = buildObjectKey(ext);

  if (!/^[a-z0-9./-]+$/.test(key)) {
    return { ok: false, code: "IMG_001" };
  }

  // 不设 x-oss-object-acl：Bucket 已是公共读，对象继承即可；RAM 策略只给了 PutObject，多带这个头反而可能被判越权
  await client.put(key, buffer, { mime: file.type });

  return {
    ok: true,
    url: `https://${bucket}.${region}.aliyuncs.com/${key}`,
    bytes: buffer.byteLength,
  };
}
