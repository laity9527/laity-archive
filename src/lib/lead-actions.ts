/**
 * 文件：src/lib/lead-actions.ts
 * 描述：线索后台 Server Actions：标记回复、关闭、软删除；会话判定走 requireAdminSession，
 *       错误码经 URL 回传由页面横幅展示
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1）。三个动作分别复用 replyLead / closeLead /
 *               softDeleteLead（DAL 内写审计），失败码 LEAD_003/LEAD_004 经 URL 回传
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { closeLead, replyLead, softDeleteLead } from "@/lib/lead-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function replyLeadAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fleads");

  const backTo = `/admin/leads/${text(formData, "id")}`;
  const result = await replyLead(text(formData, "id"), text(formData, "replyNote"), session.userId);

  if (!result.ok) redirect(`${backTo}?error=${result.code}`);
  revalidatePath("/admin/leads");
  revalidatePath(backTo);
  redirect(`${backTo}?replied=1`);
}

export async function closeLeadAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fleads");

  const backTo = text(formData, "backTo") || "/admin/leads";
  const result = await closeLead(text(formData, "id"), session.userId);

  if (!result.ok) redirect(`${backTo}?error=${result.code}`);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${text(formData, "id")}`);
  redirect(`${backTo}?closed=1`);
}

export async function deleteLeadAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fleads");

  const backTo = text(formData, "backTo") || "/admin/leads";
  if (text(formData, "confirmDelete") !== "on") {
    redirect(`${backTo}?error=LEAD_004`);
  }

  const result = await softDeleteLead(text(formData, "id"), session.userId);
  if (!result.ok) redirect(`${backTo}?error=${result.code}`);

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${text(formData, "id")}`);
  redirect(`${backTo}?deleted=1`);
}
