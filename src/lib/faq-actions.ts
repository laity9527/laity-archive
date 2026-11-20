/**
 * 文件：src/lib/faq-actions.ts
 * 描述：FAQ 后台 Server Actions：保存（新建/编辑/排序）、启用/禁用、软删除；失败码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 4.2）。保存动作复用 saveFaq（DAL 内写审计）
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { saveFaq, setFaqEnabled, softDeleteFaq } from "@/lib/faq-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function back(formData: FormData) {
  return text(formData, "backTo") || "/admin/faqs";
}

export async function saveFaqAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Ffaqs");

  const id = text(formData, "id");
  const result = await saveFaq(
    {
      id: id || undefined,
      question: text(formData, "question"),
      answer: text(formData, "answer"),
      sort: Number(text(formData, "sort") || "0"),
    },
    session.userId,
  );

  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  redirect(`${back(formData)}?saved=1`);
}

export async function setFaqEnabledAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Ffaqs");

  const result = await setFaqEnabled(text(formData, "id"), text(formData, "enabled") === "on", session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  redirect(`${back(formData)}?enabled=1`);
}

export async function deleteFaqAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Ffaqs");

  if (text(formData, "confirmDelete") !== "on") {
    redirect(`${back(formData)}?error=FAQ_004`);
  }

  const result = await softDeleteFaq(text(formData, "id"), session.userId);
  if (!result.ok) redirect(`${back(formData)}?error=${result.code}`);

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  redirect(`${back(formData)}?deleted=1`);
}
