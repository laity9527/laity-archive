/**
 * 文件：src/lib/image-signature.ts
 * 描述：按文件头字节判定图片类型（PNG/JPEG/GIF/WEBP），返回存储用的扩展名与 MIME
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 从 src/lib/oss.ts 拆出。判类型是纯计算，拆开后单测不必把 ali-oss SDK 一起装进测试进程
 */

export type ImageSignature = {
  ext: string;
  mime: string;
};

export function sniffImage(buffer: Buffer): ImageSignature | null {
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

  // RIFF....WEBP：前 4 字节 RIFF，第 9-12 字节 WEBP，中间是 4 字节小端长度
  const isRiff = starts([0x52, 0x49, 0x46, 0x46]);
  const isWebp =
    buffer.length >= 12 &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => buffer[8 + i] === b);

  if (isRiff && isWebp) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}
