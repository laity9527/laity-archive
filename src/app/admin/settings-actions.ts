/**
 * 文件：src/app/admin/settings-actions.ts
 * 描述：后台设置页的写动作：只允许改个人显示名（站点标识属部署环境，不在后台改）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 P5-1）。站点标识 / 域名 / 凭据一律只读——它们参与 metadata 与预渲染，
 *               改成 DB 驱动会与 .env 形成两套真值；本页只开“个人显示名”，其余如实展示来源键名
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { db } from "@/lib/db";
import { readField } from "@/lib/forms";

// 与表单 maxLength 同一口径；不做第二处上限
const NAME_LIMIT = 40;

export async function updateDisplayNameAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Fsettings");
  }

  const name = readField(formData, "name");

  if (name.length === 0 || name.length > NAME_LIMIT) {
    redirect("/admin/settings?error=VAL_001&field=name");
  }

  // updateMany + userId：与全站写路径同一模式（0 行即资源不存在，不抛 P2025）
  await db.user.updateMany({
    where: { id: session.userId },
    data: { name },
  });

  // 侧栏底部的显示名读的是同一字段，两处一起失效
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?profileSaved=1");
}
