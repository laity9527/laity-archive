/**
 * 文件：src/app/admin/project-actions.ts
 * 描述：项目管理 Server Actions：登录校验、参数校验、PRJ_001/PRJ_002 错误回传与页面刷新
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
import { deleteProject, saveProject, type ProjectInput } from "@/lib/projects";

const KINDS = ["product", "tool", "site"];
const STATUSES = ["WIP", "LIVE", "ARCHIVED"];
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function backToProjects(code: string): never {
  redirect(`/admin/projects?error=${code}`);
}

function parseInput(formData: FormData): ProjectInput | null {
  const input: ProjectInput = {
    id: readField(formData, "id") || undefined,
    slug: readField(formData, "slug"),
    name: readField(formData, "name"),
    kind: readField(formData, "kind"),
    status: readField(formData, "status"),
    summary: readField(formData, "summary"),
    repoUrl: readField(formData, "repoUrl"),
  };

  if (!SLUG_PATTERN.test(input.slug)) {
    return null;
  }

  if (input.name.length === 0 || input.name.length > 80) {
    return null;
  }

  if (!KINDS.includes(input.kind) || !STATUSES.includes(input.status)) {
    return null;
  }

  if ((input.summary ?? "").length > 200) {
    return null;
  }

  if (input.repoUrl && !/^https?:\/\/\S+$/.test(input.repoUrl)) {
    return null;
  }

  return input;
}

function refreshProjectViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/");
  revalidatePath("/logs");
}

export async function saveProjectAction(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session) {
    backToProjects("AUTH_001");
  }

  const input = parseInput(formData);

  if (!input) {
    backToProjects("VAL_001");
  }

  const result = await saveProject(input);

  if (!result.ok) {
    backToProjects(result.code);
  }

  refreshProjectViews();
  redirect("/admin/projects");
}

export async function deleteProjectAction(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session) {
    backToProjects("AUTH_001");
  }

  const id = readField(formData, "id");

  if (!id) {
    backToProjects("VAL_001");
  }

  const result = await deleteProject(id);

  if (!result.ok) {
    backToProjects(result.code);
  }

  refreshProjectViews();
  redirect("/admin/projects");
}
