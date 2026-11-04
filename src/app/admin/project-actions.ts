/**
 * 文件：src/app/admin/project-actions.ts
 * 描述：项目管理 Server Actions：登录校验、参数校验、PRJ_001/PRJ_002 错误回传与页面刷新
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: readField / SLUG_PATTERN 改由 src/lib/forms.ts 提供，kind/status 合法值取自 src/lib/projects.ts
 * - 2026-11-04: 两个动作的会话判定改走 requireAdminSession（带管理员标记的会话），与前置守卫同一口径
 * - 2026-11-04: 校验拆到具体字段、删除要求二次确认位、成功也带 ?saved=1/?deleted=1（D26）——
 *               原先删除一击生效且成功后跳回裸列表页，既没有确认步也没有任何结果反馈
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import type { ProjectField } from "@/lib/error-text";
import { ID_PATTERN, LIMITS, SLUG_PATTERN, readField } from "@/lib/forms";
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  deleteProject,
  saveProject,
  type ProjectInput,
} from "@/lib/projects";

const BASE = "/admin/projects";

function backToProjects(code: string, field?: ProjectField): never {
  const fieldPart = field ? `&field=${field}` : "";

  redirect(`${BASE}?error=${code}${fieldPart}`);
}

type ParseResult =
  | { ok: true; input: ProjectInput }
  | { ok: false; field: ProjectField };

function parseInput(formData: FormData): ParseResult {
  const input: ProjectInput = {
    id: readField(formData, "id") || undefined,
    slug: readField(formData, "slug"),
    name: readField(formData, "name"),
    kind: readField(formData, "kind"),
    status: readField(formData, "status"),
    summary: readField(formData, "summary"),
    repoUrl: readField(formData, "repoUrl"),
  };

  if (input.id && !ID_PATTERN.test(input.id)) {
    // id 非法时不返回它：调用方会把校验过的值拼进回跳地址
    input.id = undefined;
  }

  if (!SLUG_PATTERN.test(input.slug)) {
    return { ok: false, field: "slug" };
  }

  if (input.name.length === 0 || input.name.length > LIMITS.projectName) {
    return { ok: false, field: "name" };
  }

  if (!PROJECT_KINDS.includes(input.kind)) {
    return { ok: false, field: "kind" };
  }

  if (!PROJECT_STATUSES.includes(input.status)) {
    return { ok: false, field: "status" };
  }

  if ((input.summary ?? "").length > LIMITS.projectSummary) {
    return { ok: false, field: "summary" };
  }

  if (input.repoUrl && !/^https?:\/\/\S+$/.test(input.repoUrl)) {
    return { ok: false, field: "repoUrl" };
  }

  return { ok: true, input };
}

function refreshProjectViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/");
  revalidatePath("/logs");
}

export async function saveProjectAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    backToProjects("AUTH_001");
  }

  const parsed = parseInput(formData);

  if (!parsed.ok) {
    backToProjects("VAL_001", parsed.field);
  }

  const result = await saveProject(parsed.input);

  if (!result.ok) {
    backToProjects(result.code);
  }

  refreshProjectViews();
  redirect(`${BASE}?saved=1`);
}

export async function deleteProjectAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    backToProjects("AUTH_001");
  }

  const id = readField(formData, "id");

  if (!ID_PATTERN.test(id)) {
    backToProjects("VAL_001", "slug");
  }

  // 确认位由"再点一次"的按钮在第二次点击时置上。它是防手滑而不是访问控制——
  // 脚本直调照样能带上，所以页面文案与 DESIGN 都按这个口径写（D26）
  if (readField(formData, "confirmDelete") !== "on") {
    backToProjects("PRJ_003");
  }

  const result = await deleteProject(id);

  if (!result.ok) {
    backToProjects(result.code);
  }

  refreshProjectViews();
  redirect(`${BASE}?deleted=1`);
}
