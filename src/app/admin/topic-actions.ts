/**
 * 文件：src/app/admin/topic-actions.ts
 * 描述：主题后台 Server Actions：保存（新建/改名/描述/排序）、删除（需勾选确认）；错误码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 7）。会话判定走 requireAdminSession；
 *               删除动作要求勾选确认，服务端再按关联日志数拦截（TOPIC_003）
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { deleteTopic, saveTopic } from "@/lib/topic-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveTopicAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Ftopics");

  const id = text(formData, "id");
  const result = await saveTopic(
    {
      id: id || undefined,
      name: text(formData, "name"),
      description: text(formData, "description"),
      sortOrder: Number(text(formData, "sortOrder") || "0"),
    },
    session.userId,
  );

  if (!result.ok) redirect(`/admin/topics?error=${result.code}`);
  revalidatePath("/admin/topics");
  redirect("/admin/topics?saved=1");
}

export async function deleteTopicAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Ftopics");

  const id = text(formData, "id");
  if (text(formData, "confirmDelete") !== "on") {
    redirect("/admin/topics?error=TOPIC_004");
  }

  const result = await deleteTopic(id, session.userId);
  if (!result.ok) redirect(`/admin/topics?error=${result.code}`);

  revalidatePath("/admin/topics");
  redirect("/admin/topics?deleted=1");
}
