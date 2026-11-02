/**
 * 文件：src/app/admin/project-actions.ts
 * 描述：项目管理 Server Actions：登录校验、参数校验、PRJ_001/PRJ_002 错误回传与页面刷新
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: readField / SLUG_PATTERN 改由 src/lib/forms.ts 提供，kind/status 合法值取自 src/lib/projects.ts
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SLUG_PATTERN, readField } from "@/lib/forms";
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  deleteProject,
  saveProject,
  type ProjectInput,
} from "@/lib/projects";

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

  if (!PROJECT_KINDS.includes(input.kind) || !PROJECT_STATUSES.includes(input.status)) {
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
