/**
 * 文件：src/app/admin/upload-action.ts
 * 描述：图片上传 Server Action：会话校验 + 转发到 OSS 封装，返回可嵌入 Markdown 的公共读直链
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5b 初始创建。与日志/项目动作不同，这里要拿返回值插进编辑器，所以用返回对象而非 redirect 错误码
 * - 2026-11-02: 去掉未使用的 UploadImageResult 导入（Phase 5b 验证时 lint 报的 warn）
 * - 2026-11-04: 会话判定改走 requireAdminSession，与前置守卫同一口径
 * - 2026-11-04: 上传的文件参数改按 Blob 判定并显式拒零字节：原先写 instanceof File，
 *               反序列化后的实体不是 File，真实上传一律 IMG_001（I061，这是那条"未实测分支"第一次跑通）
 */
"use server";

import { requireAdminSession } from "@/auth";
import { uploadImage } from "@/lib/oss";

export type UploadActionResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; code: "AUTH_001" | "IMG_001" };

export async function uploadImageAction(
  formData: FormData,
): Promise<UploadActionResult> {
  const session = await requireAdminSession();

  if (!session) {
    return { ok: false, code: "AUTH_001" };
  }

  const file = formData.get("file");

  // File extends Blob，但动作参数跨 React 边界反序列化后这里的实体是 Blob——
  // 写 instanceof File 会把所有合法上传判成 IMG_001（实测：70 字节的合法 PNG 也被拒）
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, code: "IMG_001" };
  }

  // OSS 侧异常不吞：让它冒到调用方，页面显示"上传失败"，服务端日志留真错
  return uploadImage(file);
}
