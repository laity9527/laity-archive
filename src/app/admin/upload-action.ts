/**
 * 文件：src/app/admin/upload-action.ts
 * 描述：图片上传 Server Action：会话校验 + 转发到 OSS 封装，返回可嵌入 Markdown 的公共读直链
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: Phase 5b 初始创建。与日志/项目动作不同，这里要拿返回值插进编辑器，所以用返回对象而非 redirect 错误码
 * - 2026-11-02: 去掉未使用的 UploadImageResult 导入（Phase 5b 验证时 lint 报的 warn）
 */
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { uploadImage } from "@/lib/oss";

export type UploadActionResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; code: "AUTH_001" | "IMG_001" };

export async function uploadImageAction(
  formData: FormData,
): Promise<UploadActionResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { ok: false, code: "AUTH_001" };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, code: "IMG_001" };
  }

  // OSS 侧异常不吞：让它冒到调用方，页面显示"上传失败"，服务端日志留真错
  return uploadImage(file);
}
