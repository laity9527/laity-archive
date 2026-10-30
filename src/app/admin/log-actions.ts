/**
 * 文件：src/app/admin/log-actions.ts
 * 描述：日志 Server Actions：保存草稿、发布存证；登录与参数校验，错误码经 URL 回传
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { publishLog, saveLog, type LogInput } from "@/lib/publish";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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

  const result = await publishLog(id);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews(result.slug);
  redirect(`${backTo}?published=1`);
}
