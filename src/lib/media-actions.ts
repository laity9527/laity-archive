/**
 * 文件：src/lib/media-actions.ts
 * 描述：媒体库后台 Server Actions：绑定/解绑轨迹、标记 isEvidence、软删除；
 *       会话判定走 requireAdminSession，失败码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.3）。四个动作复用 media-admin（DAL 内写审计）
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { bindMedia, setMediaEvidence, softDeleteMedia, unbindMedia } from "@/lib/media-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function back(formData: FormData) {
  return text(formData, "backTo") || "/admin/media";
}

export async function bindMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fmedia");

  const result = await bindMedia(text(formData, "id"), text(formData, "traceId"), session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/media");
  redirect(`${back(formData)}?bound=1`);
}

export async function unbindMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fmedia");

  const result = await unbindMedia(text(formData, "id"), session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/media");
  redirect(`${back(formData)}?unbound=1`);
}

export async function setMediaEvidenceAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fmedia");

  const result = await setMediaEvidence(text(formData, "id"), text(formData, "isEvidence") === "on", session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/media");
  redirect(`${back(formData)}?evidence=1`);
}

export async function deleteMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fmedia");

  if (text(formData, "confirmDelete") !== "on") {
    redirect(`${back(formData)}?error=MEDIA_004`);
  }

  const result = await softDeleteMedia(text(formData, "id"), session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/media");
  redirect(`${back(formData)}?deleted=1`);
}
