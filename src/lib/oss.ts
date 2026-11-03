/**
 * 文件：src/lib/oss.ts
 * 描述：阿里云 OSS 图片上传封装：校验类型与大小后以 PutObject 写入 logs/ 前缀，返回公共读直链
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5b 初始创建。密钥只从环境变量读取；对象名完全由服务端生成，不使用上传文件名
 * - 2026-11-02: 删掉零引用的 isSupportedImage()，类型判定统一走 EXT_BY_MIME 查表
 * - 2026-11-03: 类型判定改为读文件内容签名（magic bytes），不再信任浏览器上报的 MIME；
 *               伪造 image/png 的 .exe 或不完整文件头一律 IMG_001（I032）
 */
import { randomBytes } from "node:crypto";
import OSS from "ali-oss";

// SPEC IMG_001：仅 jpg/png/webp/gif，且不超过 5MB
const MAX_BYTES = 5 * 1024 * 1024;

type ImageSignature = { ext: string; mime: string };

// 按文件头字节判定真实类型：前端的 file.type 与文件名都可以随意伪造，不能作为依据
function sniffImage(buffer: Buffer): ImageSignature | null {
  const starts = (bytes: number[]) =>
    buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);

  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", mime: "image/png" };
  }

  if (starts([0xff, 0xd8, 0xff])) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (starts([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) {
    return { ext: "gif", mime: "image/gif" };
  }

  if (starts([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
    return { ext: "gif", mime: "image/gif" };
  }

  // RIFF....WEBP：前 4 字节 RIFF，第 9-12 字节 WEBP，中间是 4 字节长度
  const isRiff = starts([0x52, 0x49, 0x46, 0x46]);
  const isWebp =
    buffer.length >= 12 &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => buffer[8 + i] === b);

  if (isRiff && isWebp) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

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
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    return { ok: false, code: "IMG_001" };
  }

  const image = sniffImage(buffer);

  if (!image) {
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

  const key = buildObjectKey(image.ext);

  if (!/^[a-z0-9./-]+$/.test(key)) {
    return { ok: false, code: "IMG_001" };
  }

  // 不设 x-oss-object-acl：Bucket 已是公共读，对象继承即可；RAM 策略只给了 PutObject，多带这个头反而可能被判越权
  await client.put(key, buffer, { mime: image.mime });

  return {
    ok: true,
    url: `https://${bucket}.${region}.aliyuncs.com/${key}`,
    bytes: buffer.byteLength,
  };
}
