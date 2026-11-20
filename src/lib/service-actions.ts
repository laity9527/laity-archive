/**
 * 文件：src/lib/service-actions.ts
 * 描述：服务介绍后台 Server Actions：保存（新建/编辑/排序）、启用/禁用、软删除；失败码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 3.2）。保存动作复用 saveService（DAL 内写审计）
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { saveService, setServiceEnabled, softDeleteService } from "@/lib/service-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function back(formData: FormData) {
  return text(formData, "backTo") || "/admin/services";
}

export async function saveServiceAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fservices");

  const id = text(formData, "id");
  const result = await saveService(
    {
      id: id || undefined,
      title: text(formData, "title"),
      summary: text(formData, "summary"),
      body: text(formData, "body"),
      sort: Number(text(formData, "sort") || "0"),
    },
    session.userId,
  );

  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);
  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect(`${back(formData)}?saved=1`);
}

export async function setServiceEnabledAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fservices");

  const result = await setServiceEnabled(text(formData, "id"), text(formData, "enabled") === "on", session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect(`${back(formData)}?enabled=1`);
}

export async function deleteServiceAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fservices");

  if (text(formData, "confirmDelete") !== "on") {
    redirect(`${back(formData)}?error=SERVICE_004`);
  }

  const result = await softDeleteService(text(formData, "id"), session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect(`${back(formData)}?deleted=1`);
}
