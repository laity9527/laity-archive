/**
 * 文件：src/lib/media-whitelist.ts
 * 描述：媒体上传白名单纯函数：图片/文档扩展名白名单、可执行黑名单、
 *       内容签名嗅探（magic bytes）与大小上限——类型判定不信任浏览器上报的 MIME
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.2）。图片复用 image-signature.ts 的 sniffImage；
 *               文档按 %PDF / PK 压缩包 / 纯文本三类嗅探；扩展名与内容类别必须一致才算通过
 */
import { Prisma } from "@prisma/client";
import { sniffImage } from "./image-signature.ts";

// 媒体库大小上限（文档可比日志插图大，单设 20MB 口径）
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export type MediaCategory = "image" | "document";

// 图片白名单（svg 不在内：方案明确禁 SVG，防 XSS 向量）
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

// 文档白名单
const DOCUMENT_EXTS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"]);

// 可执行与脚本黑名单：无论扩展名如何都不放行
const EXECUTABLE_EXTS = new Set([
  "exe", "dll", "so", "dylib", "msi", "com", "scr",
  "sh", "bash", "bat", "cmd", "ps1", "py", "js", "mjs", "jar", "war", "class",
]);

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** 扩展名白名单判定：不在图片/文档白名单、或命中可执行黑名单，一律拒绝 */
export function isAllowedMediaFile(fileName: string): boolean {
  const ext = extOf(fileName);
  if (EXECUTABLE_EXTS.has(ext)) return false;
  return IMAGE_EXTS.has(ext) || DOCUMENT_EXTS.has(ext);
}

/** 扩展名 → 内容类别；不在白名单返回 null */
export function mediaFileCategory(fileName: string): MediaCategory | null {
  const ext = extOf(fileName);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (DOCUMENT_EXTS.has(ext)) return "document";
  return null;
}

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);
}

/** 内容签名嗅探：返回实际内容类别；与扩展名声明不符即视为伪造 */
export function sniffMedia(buffer: Buffer): MediaCategory | null {
  if (sniffImage(buffer)) return "image";

  // PDF：%PDF- 头
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return "document";

  // Office 文档（docx/xlsx/pptx 等）为 zip 容器：PK\x03\x04
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return "document";

  // Office 老格式（doc/xls/ppt）为 OLE2 复合文档：D0 CF 11 E0
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0])) return "document";

  // 纯文本（txt/md）：首个字节非零且可打印字符占比高
  if (buffer.length > 0 && buffer[0] !== 0) {
    let printable = 0;
    const sample = buffer.subarray(0, Math.min(buffer.length, 512));
    for (const byte of sample) {
      if (byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte < 0x7f) || byte >= 0x80) {
        printable += 1;
      }
    }
    if (printable / sample.length >= 0.95) return "document";
  }

  return null;
}

/** 扩展名声明与内容签名一致性校验：类别一致才放行 */
export function mediaContentMatchesExtension(fileName: string, buffer: Buffer): boolean {
  const declared = mediaFileCategory(fileName);
  if (!declared) return false;
  const actual = sniffMedia(buffer);
  return actual === declared;
}

// 审计条目构造（纯函数）：媒体上传/绑定/解绑/标记/删除的审计统一走这里，单测可断言
export type MediaAuditAction =
  | "media.sign" // 签发直传地址（收尾自检补）
  | "media.upload"
  | "media.bind"
  | "media.unbind"
  | "media.evidence"
  | "media.delete"
  | "media.reject"; // 完成登记时的拒收（超限/内容不符，收尾自检补）

export function mediaAuditEntry(
  actorId: string,
  action: MediaAuditAction,
  media: { id: string },
  extra: Record<string, unknown> = {},
): { actorId: string; action: string; targetType: string; targetId: string; meta: Prisma.InputJsonValue } {
  return {
    actorId,
    action,
    targetType: "Media",
    targetId: media.id,
    meta: extra as Prisma.InputJsonValue,
  };
}
