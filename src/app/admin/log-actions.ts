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
 * - 2026-11-04: 四个动作的会话判定改走 requireAdminSession：与前置守卫同一判据（带管理员标记的会话），
 *               不再接受"任何有效会话"
 * - 2026-11-04: publishLogAction 改为"先存再发"（D25）：原先发布表单只带 id，改了正文不点保存直接发布
 *               会把库里的旧内容发出去，而页面写的是"按当前正文算摘要"
 * - 2026-11-04: parseInput 改成 {ok, input} | {ok:false, field}（D26）：原先 9 条规则共用一句 VAL_001，
 *               用户看到的是一整张表单的规则而非错在哪；id/projectId 也在此处按形状与存在性挡下，
 *               不再让脏 id 拼进 redirect 或变成未捕获的外键错
 * - 2026-11-09: V2.0 Step 4-B：四个动作把 session.userId 传给数据层；assertProjectExists 也按
 *               本租户的项目列表校验——别人的 projectId 与不存在的同判 VAL_001(field=project)
 * - 2026-11-10: I079 修复：refreshLogViews 去掉对已退役 /logs 路径的 revalidate（静默无效的死代码），
 *               改为无参（租户页是请求期取数，不需按 handle 失效）
 * - 2026-11-10: V2.0 Step 6 Commit 3：parseInput 收 isAiAssisted（表单带隐藏域才为 true），
 *               随 LogInput 落库（详情页据此打「AI 辅助生成」标签）
 * - 2026-11-16: B3 第一刀：新增列表行内快捷动作 quickPublishAction / quickUnpublishAction——
 *               只收 id、不接表单正文；写路径仍复用 publishLog（按库中正文算摘要 + 敏感扫描）与 unpublishLog，
 *               成功后回列表页，错误码经 URL 回传由 Toast 展示
 * - 2026-11-16: 评审 G10：新增 importLogAction——导入 Markdown 只建草稿，
 *               slug 冲突由 saveLog 的 LOG_001 回传（不覆盖），成功后进编辑页补齐标签与时间
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import type { LogField } from "@/lib/error-text";
import { ID_PATTERN, LIMITS, SLUG_PATTERN, parseTagList, readField } from "@/lib/forms";
import { listProjectIds } from "@/lib/projects";
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
  return parseTagList(raw);
}

type ParseResult = { ok: true; input: LogInput } | { ok: false; field: LogField };

function parseInput(formData: FormData): ParseResult {
  const beforeDate = parseDate(readField(formData, "beforeDate"));
  const rawAfter = readField(formData, "afterDate");
  const afterDate = rawAfter ? parseDate(rawAfter) : null;
  const tags = parseTags(readField(formData, "tags"));
  // 系列名可空；超长拒收而不是静默截断，避免两条日志因截断意外并成同一系列
  const series = readField(formData, "series").trim();
  const rawId = readField(formData, "id");

  if (rawId && !ID_PATTERN.test(rawId)) {
    return { ok: false, field: "id" };
  }

  if (!beforeDate) {
    return { ok: false, field: "beforeDate" };
  }

  if (rawAfter && !afterDate) {
    return { ok: false, field: "afterDate" };
  }

  const input: LogInput = {
    id: rawId || undefined,
    projectId: readField(formData, "projectId"),
    slug: readField(formData, "slug"),
    title: readField(formData, "title"),
    tags,
    series,
    beforeContent: readField(formData, "beforeContent"),
    afterContent: readField(formData, "afterContent"),
    beforeDate,
    afterDate: afterDate ?? undefined,
    lessonLearned: readField(formData, "lessonLearned"),
    isAiAssisted: readField(formData, "isAiAssisted") === "true",
  };

  if (!SLUG_PATTERN.test(input.slug)) {
    return { ok: false, field: "slug" };
  }

  if (input.title.length === 0 || input.title.length > LIMITS.title) {
    return { ok: false, field: "title" };
  }

  if (input.projectId.length === 0) {
    return { ok: false, field: "project" };
  }

  if (tags.length > LIMITS.tags || tags.some((tag) => tag.length > LIMITS.tag)) {
    return { ok: false, field: "tags" };
  }

  if (series.length > LIMITS.series) {
    return { ok: false, field: "series" };
  }

  if (input.beforeContent.length === 0) {
    return { ok: false, field: "beforeContent" };
  }

  if (afterDate && afterDate.getTime() < beforeDate.getTime()) {
    return { ok: false, field: "afterDate" };
  }

  if ((input.lessonLearned ?? "").length > LIMITS.lesson) {
    return { ok: false, field: "lessonLearned" };
  }

  return { ok: true, input };
}

// 表单里的 projectId 是客户端可控值：不存在的外键值会一路走到 write 并抛 P2003（500），
// 所以在挡一道"确实是本租户名下的项目"，比让数据库报错更好读；别人的项目与不存在同判
async function assertProjectExists(projectId: string, userId: string, backTo: string) {
  const ids = await listProjectIds(userId);

  if (!ids.includes(projectId)) {
    redirect(`${backTo}?error=VAL_001&field=project`);
  }
}

// 校验失败时把出错字段一起带回去：页面据此标住那一个控件，而不是把整张表单的规则念一遍
function reject(backTo: string, field: LogField): never {
  redirect(`${backTo}?error=VAL_001&field=${field}`);
}

// 页面全部请求期取数（instant=false + 直接查库），revalidate 只对缓存壳有意义；
// 原 /logs 与 /logs/<slug> 两行是 Step 3 退役的旧路由，对不存在的路径 revalidate 静默无效（I079）。
// 租户页 /u/[handle]/... 同为请求期取数，不需要按 handle 再失效一遍
function refreshLogViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = ID_PATTERN.test(id) ? `/admin/logs/${id}/edit` : "/admin/logs/new";

  const session = await requireAdminSession();

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  const parsed = parseInput(formData);

  if (!parsed.ok) {
    reject(backTo, parsed.field);
  }

  const { input } = parsed;

  await assertProjectExists(input.projectId, session.userId, backTo);

  const result = await saveLog(input, session.userId);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews();
  redirect(`/admin/logs/${result.id}/edit?saved=1`);
}

/**
 * 导入 Markdown（G10）：只创建草稿，不发布。
 * slug 冲突由 saveLog 的 LOG_001 回传（不覆盖已有日志）；成功后进编辑页补齐时间与标签。
 */
export async function importLogAction(formData: FormData) {
  const backTo = "/admin/logs/import";
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(backTo)}`);
  }

  const parsed = parseInput(formData);

  if (!parsed.ok) {
    reject(backTo, parsed.field);
  }

  await assertProjectExists(parsed.input.projectId, session.userId, backTo);

  const result = await saveLog(parsed.input, session.userId);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews();
  redirect(`/admin/logs/${result.id}/edit?saved=1&imported=1`);
}

export async function publishLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = ID_PATTERN.test(id) ? `/admin/logs/${id}/edit` : "/admin/logs/new";

  const session = await requireAdminSession();

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  if (!ID_PATTERN.test(id)) {
    reject(backTo, "id");
  }

  // 先存再发：发布按钮与表单字段同在一张表单（per-button formAction），
  // 原先它只带一个 id，改了正文不点"保存"直接发布会把库里的旧内容发出去，
  // 而页面上写的是"按当前正文算 SHA-256"——所见必须等于所发
  const parsed = parseInput(formData);

  if (!parsed.ok) {
    reject(backTo, parsed.field);
  }

  const { input } = parsed;

  await assertProjectExists(input.projectId, session.userId, backTo);

  const saved = await saveLog({ ...input, id }, session.userId);

  if (!saved.ok) {
    redirect(`${backTo}?error=${saved.code}`);
  }

  const result = await publishLog(saved.id, session.userId, {
    // 确认标记只影响"要不要放行"，扫描本身在服务端读刚存进库的正文，客户端伪造不了内容
    sensitiveConfirmed: readField(formData, "sensitiveConfirmed") === "on",
  });

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews();
  redirect(`${backTo}?published=1`);
}

export async function unpublishLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = ID_PATTERN.test(id) ? `/admin/logs/${id}/edit` : "/admin";

  const session = await requireAdminSession();

  if (!session) {
    redirect(`${backTo}?error=AUTH_001`);
  }

  if (!ID_PATTERN.test(id)) {
    reject(backTo, "id");
  }

  const result = await unpublishLog(id, session.userId);

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews();
  redirect(`${backTo}?unpublished=1`);
}

// 彻底删除：行连同摘要一起消失，与"下架"不同，因此回跳的是后台首页而不是编辑页
export async function deleteLogAction(formData: FormData) {
  const id = readField(formData, "id");
  const backTo = ID_PATTERN.test(id) ? `/admin/logs/${id}/edit` : "/admin";

  const session = await requireAdminSession();

  if (!session) {
    redirect(`/admin?error=AUTH_001`);
  }

  if (!ID_PATTERN.test(id)) {
    reject(backTo, "id");
  }

  const result = await deleteLog(id, session.userId, readField(formData, "confirmSlug"));

  if (!result.ok) {
    redirect(`${backTo}?error=${result.code}`);
  }

  refreshLogViews();
  redirect(`/admin?deleted=1`);
}

// 列表行内快捷动作（B3）：只收 id、不接表单正文——发布仍走 publishLog，
// 也就是按库中正文重算 SHA-256 并做敏感扫描（命中即回落 LOG_003，让用户去编辑页处理），
// 语义与编辑页的「保存并发布」一致，不另开一套写路径
export async function quickPublishAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs");
  }

  const id = readField(formData, "id");

  if (!ID_PATTERN.test(id)) {
    redirect("/admin/logs?error=VAL_001&field=id");
  }

  const result = await publishLog(id, session.userId, {
    sensitiveConfirmed: false,
  });

  if (!result.ok) {
    redirect(`/admin/logs?error=${result.code}`);
  }

  refreshLogViews();
  redirect("/admin/logs?published=1");
}

export async function quickUnpublishAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs");
  }

  const id = readField(formData, "id");

  if (!ID_PATTERN.test(id)) {
    redirect("/admin/logs?error=VAL_001&field=id");
  }

  const result = await unpublishLog(id, session.userId);

  if (!result.ok) {
    redirect(`/admin/logs?error=${result.code}`);
  }

  refreshLogViews();
  redirect("/admin/logs?unpublished=1");
}

// 批量下架（B3）：只收 id 列表，逐条复用 unpublishLog。不提供批量发布与批量删除——
// 发布要按正文重算摘要并过敏感扫描（应逐条确认），删除是破坏性动作（要求输 slug 确认）
export async function bulkUnpublishAction(formData: FormData) {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Flogs");
  }

  const ids = formData
    .getAll("id")
    .filter(
      (value): value is string =>
        typeof value === "string" && ID_PATTERN.test(value),
    );

  if (ids.length === 0) {
    redirect("/admin/logs?error=VAL_001&field=id");
  }

  let done = 0;

  for (const id of ids) {
    const result = await unpublishLog(id, session.userId);

    if (result.ok) done += 1;
  }

  refreshLogViews();
  redirect(`/admin/logs?bulkUnpublished=${done}`);
}
