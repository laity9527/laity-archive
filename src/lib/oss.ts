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
 * - 2026-11-03: 签名判定拆到 src/lib/image-signature.ts，本文件只管"凭据、大小上限、对象键、写入"
 * - 2026-11-04: 入参类型由 File 放宽到 Blob：动作参数跨 React 边界反序列化后拿到的是 Blob，
 *               上传路径因此一直被判 IMG_001（I061）；本函数只用到 arrayBuffer 与大小，两者都成立
 * - 2026-11-04: 对象名断言改为允许大写（同 I061）：时间戳取自 toISOString()，里面必然有大写 T 与 Z，
 *               原来的 [a-z0-9./-] 把自己生成的每个键都判死，上传从来没有过一次成功
 * - 2026-11-04: 键生成与断言拆到 src/lib/object-key.ts，本文件不再自带这两段——拆前它们都在
 *               ali-oss 的模块里，node --test 覆盖不到，所以这条"生成器比断言更宽松"的矛盾活了很久
 */
import { randomBytes } from "node:crypto";
import OSS from "ali-oss";
import { sniffImage } from "@/lib/image-signature";
import { buildObjectKey as objectKeyOf, isObjectKeySafe } from "@/lib/object-key";

// SPEC IMG_001：仅 jpg/png/webp/gif，且不超过 5MB
const MAX_BYTES = 5 * 1024 * 1024;

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
  return objectKeyOf(new Date(), ext, randomBytes(6).toString("hex"));
}

export async function uploadImage(file: Blob): Promise<UploadImageResult> {
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

  if (!isObjectKeySafe(key)) {
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
