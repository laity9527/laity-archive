/**
 * 文件：src/app/admin/preview-actions.ts
 * 描述：公开预览链接的 Server Actions：生成 24h 链接（token 只在回跳 URL 里出现一次）、撤销全部
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G7）。生成后把明文 token 放回跳参数，编辑页展示一次；
 *               库里只有哈希。撤销按日志一次性清空，避免逐条管理的复杂度
 */
"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { ID_PATTERN } from "@/lib/forms";
import {
  createPreviewToken,
  revokePreviewTokens,
} from "@/lib/preview";

function backTo(id: string) {
  return `/admin/logs/${id}/edit`;
}

export async function createPreviewLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(backTo(id))}`);
  }

  if (!ID_PATTERN.test(id)) {
    redirect("/admin/logs");
  }

  const created = await createPreviewToken(id, session.userId);

  if (!created) {
    redirect(`${backTo(id)}?error=LOG_002`);
  }

  const params = new URLSearchParams({
    preview: created.token,
    previewExpires: created.expiresAt.toISOString(),
  });

  redirect(`${backTo(id)}?${params.toString()}`);
}

export async function revokePreviewLinksAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(backTo(id))}`);
  }

  if (!ID_PATTERN.test(id)) {
    redirect("/admin/logs");
  }

  await revokePreviewTokens(id, session.userId);
  redirect(`${backTo(id)}?previewRevoked=1`);
}
