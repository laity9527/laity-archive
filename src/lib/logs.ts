/**
 * 文件：src/lib/logs.ts
 * 描述：前台日志数据访问封装，内部强制 isPublished: true（草稿隔离）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表查询），Phase 2 补齐详情查询
 * - 2026-10-30: 列表支持 project/tag 筛选；新增 getSafeLogBySlug 详情查询
 * - 2026-10-30: 新增 isPublishedLogSlug 供 Proxy 前置判定 404 状态码
 * - 2026-10-30: 追加管理侧查询 listAdminLogs / getAdminLogById（不经过 isPublished 过滤，仅供后台）
 * - 2026-11-04: 删掉零调用的 listAdminLogs（D27）：后台概览与编辑页各有各的取数，这个全表查询自Phase 4后没人引；顺带给前窗口腾出 7 行
 * - 2026-11-06: 新增 getLatestLogs（首页「最新日志」按发布时间排序，见 D13 修订）；getSafeLogs 的 take 选项随唯一调用方迁走一并删除
 * - 2026-11-09: V2.0 Step 2：getSafeLogBySlug / isPublishedLogSlug 改走 userId_slug 复合键，
 *               新增 handle 默认参数（'zhanglei'，内部经 projects.ts 的 resolveUserId 解析 userId）；
 *               过渡期 /logs/[slug] 与 proxy 404 判定只覆盖该租户，Step 3 全局大厅口径随路由改造收口
 * - 2026-11-09: V2.0 Step 3 阶段一：handle 由路由传入、默认参数移除；getSafeLogs 的 filter 新增 handle
 *               （详情页用它挡住同名 slug 的跨租户日志，不给维持全局大厅口径）；
 *               getSafeLogs/getLatestLogs 的 include 补 user.handle（大厅行拼 /u/[handle]/... 链接用）；
 *               getLatestLogs 新增 userId 第二参数供租户主页取该租户最新日志
 * - 2026-11-09: V2.0 Step 4-B：getAdminLogById 加 userId 条件（findFirst 复合键），
 *               include 补 user.handle——编辑页「看前台」链接拼 /u/[handle]/logs/[slug] 要用
 */
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/projects";

export type SafeLogFilter = {
  project?: string;
  tag?: string;
  // Step 3：给了 handle 先解析成 userId 注入 where（项目详情页用它挡住同名 slug 的跨租户日志）；
  // 不给维持全局大厅口径（裁定 ①：/logs 是全站公共大厅，严格 isPublished）
  handle?: string;
};

const projectSelect = {
  select: { name: true, slug: true, kind: true, status: true },
} as const;

export async function getSafeLogs(filter: SafeLogFilter = {}) {
  let userId: string | null = null;

  if (filter.handle) {
    userId = await resolveUserId(filter.handle);

    if (!userId) {
      return [];
    }
  }

  const rows = await db.log.findMany({
    where: {
      isPublished: true,
      ...(userId ? { userId } : {}),
      ...(filter.project ? { project: { slug: filter.project } } : {}),
      ...(filter.tag ? { tags: { has: filter.tag } } : {}),
    },
    orderBy: { beforeDate: "desc" },
    // 大厅行要拼 /u/[handle]/logs/[slug] 的跳转链接，owner 的 handle 属于公开标识，随 select 白名单带出
    include: { project: projectSelect, user: { select: { handle: true } } },
  });

  // 可选关系的 include 类型是 user|null：回填后本不该有无主行（有则异常），前台不展示——
  // 局部变量先收窄再展开（TS 不对交叉类型做属性访问收窄，filter 谓词同理），
  // 调用方拿 log.user.handle 不需要非空断言
  type OwnedLog = (typeof rows)[number] & { user: { handle: string } };
  const owned: OwnedLog[] = [];
  for (const log of rows) {
    const user = log.user;
    if (!user) continue;
    owned.push({ ...log, user });
  }
  return owned;
}

// 首页「最新日志」口径：beforeDate 是"哪天做的决策"，publishedAt 才是"什么时候写出来的"，
// 访客在这里要读最新动态，所以按发布时间排——BEFORE 填几天前都不影响它顶到最前（D13 修订）
export async function getLatestLogs(take: number, userId?: string) {
  const rows = await db.log.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isPublished: true,
      publishedAt: { not: null },
    },
    // 实测 11 篇批量入库里有 10 篇 publishedAt 完全相同（同一秒），
    // 只按它排序时前三条会退化成不确定子集，再用 beforeDate 兜底成确定顺序
    orderBy: [{ publishedAt: "desc" }, { beforeDate: "desc" }],
    take,
    include: { project: projectSelect, user: { select: { handle: true } } },
  });

  // 同 getSafeLogs：无主行跳过，局部变量收窄后展开
  type OwnedLog = (typeof rows)[number] & { user: { handle: string } };
  const owned: OwnedLog[] = [];
  for (const log of rows) {
    const user = log.user;
    if (!user) continue;
    owned.push({ ...log, user });
  }
  return owned;
}

export async function getSafeLogBySlug(slug: string, handle: string) {
  // V2.0 Step 3：handle 由路由传入（/u/[handle]/logs/[slug]），默认参数已移除
  const userId = await resolveUserId(handle);

  if (!userId) {
    return null;
  }

  return db.log.findFirst({
    // findFirst 的 where 只收字面字段：复合唯一键名（userId_slug）在 findUnique/upsert 里可用，
    // 这里用 userId+slug 两字段同样命中 @@unique 索引（isPublished 只做草稿隔离）
    where: { userId, slug, isPublished: true },
    include: { project: projectSelect },
  });
}

// Proxy 前置判定只关心命中与否，Select id 让这次查询停留在索引层面
export async function isPublishedLogSlug(slug: string, handle: string) {
  const userId = await resolveUserId(handle);

  if (!userId) {
    return false;
  }

  const hit = await db.log.findFirst({
    where: { userId, slug, isPublished: true },
    select: { id: true },
  });

  return hit !== null;
}

export async function getAdminLogById(id: string, userId: string) {
  return db.log.findFirst({
    where: { id, userId },
    include: {
      project: { select: { name: true } },
      user: { select: { handle: true } },
    },
  });
}

