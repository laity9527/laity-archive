/**
 * 文件：src/app/admin/log-actions.ts
 * 描述：日志 Server Actions：保存草稿、发布存证；登录与参数校验，错误码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: readField 与 SLUG_PATTERN 改由 src/lib/forms.ts 提供
 * - 2026-11-02: 补 unpublishLogAction（SPEC:117 的下架动作，此前无实现）
 * - 2026-11-03: 发布动作透传敏感信息确认标记；补 deleteLogAction（彻底删除）
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SLUG_PATTERN, readField } from "@/lib/forms";
import {
  deleteLog,
  publishLog,
  saveLog,
  unpublishLog,
  type LogInput,
} from "@/lib/publish";

function parseDate(raw: string) {
  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTags(raw: string) {
  return raw
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseInput(formData: FormData): LogInput | null {
  const beforeDate = parseDate(readField(formData, "beforeDate"));
  const rawAfter = readField(formData, "afterDate");
  const afterDate = rawAfter ? parseDate(rawAfter) : null;
  const tags = parseTags(readField(formData, "tags"));

  if (!beforeDate) {
    return null;
  }

  if (rawAfter && !afterDate) {
    return null;
  }

  const input: LogInput = {
    id: readField(formData, "id") || undefined,
    projectId: readField(formData, "projectId"),
    slug: readField(formData, "slug"),
    title: readField(formData, "title"),
    tags,
    beforeContent: readField(formData, "beforeContent"),
    afterContent: readField(formData, "afterContent"),
    beforeDate,
    afterDate: afterDate ?? undefined,
    lessonLearned: readField(formData, "lessonLearned"),
  };

  if (!SLUG_PATTERN.test(input.slug) || input.title.length === 0 || input.title.length > 120) {
    return null;
  }

  if (input.projectId.length === 0) {
    return null;
  }

  if (tags.length > 10 || tags.some((tag) => tag.length > 24)) {
    return null;
  }

  if (input.beforeContent.length === 0) {
    return null;
  }

  if (afterDate && afterDate.getTime() < beforeDate.getTime()) {
    return null;
  }

  if ((input.lessonLearned ?? "").length > 500) {
    return null;
  }

  return input;
}

function refreshLogViews(slug: string) {
  revalidatePath("/");
  revalidatePath("/logs");
  revalidatePath(`/logs/${slug}`);
  revalidatePath("/admin");
}

export async function saveLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = id ? `/admin/logs/${id}/edit` : "/admin/logs/new";

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  const input = parseInput(formData);

  if (!input) {
    redirect(`${backTo}?error=VAL_001`);
  }

  const result = await saveLog(input);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews(result.slug);
  redirect(`/admin/logs/${result.id}/edit?saved=1`);
}

export async function publishLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = id ? `/admin/logs/${id}/edit` : "/admin/logs/new";

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  if (!id) {
    redirect(`${backTo}?error=VAL_001`);
  }

  const result = await publishLog(id, {
    // 确认标记只影响"要不要放行"，扫描本身在服务端读库里的正文，客户端伪造不了内容
    sensitiveConfirmed: readField(formData, "sensitiveConfirmed") === "on",
  });

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews(result.slug);
  redirect(`${backTo}?published=1`);
}

export async function unpublishLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = id ? `/admin/logs/${id}/edit` : "/admin";

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  if (!id) {
    redirect(`${backTo}?error=VAL_001`);
  }

  const result = await unpublishLog(id);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews(result.slug);
  redirect(`${backTo}?unpublished=1`);
}

// 彻底删除：行连同摘要一起消失，与"下架"不同，因此回跳的是后台首页而不是编辑页
export async function deleteLogAction(formData: FormData) {
  const id = readField(formData, "id");

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/admin?error=AUTH_001`);
  }

  if (!id) {
    redirect(`/admin?error=VAL_001`);
  }

  const result = await deleteLog(id, readField(formData, "confirmSlug"));

  if (!result.ok) {
    redirect(`/admin/logs/${id}/edit?error=${result.code}`);
  }

  refreshLogViews(result.slug);
  redirect(`/admin?deleted=1`);
}
