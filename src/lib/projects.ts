/**
 * 文件：src/lib/projects.ts
 * 描述：项目数据访问：管理侧列表（含日志数）、概览统计、增改删与 PRJ_001/PRJ_002 判定；公开侧列表与按 slug 查询
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: Phase 5a 补 listPublicProjects / getPublicProjectBySlug，只取可公开展示的字段
 * - 2026-11-02: 补 PROJECT_KINDS / PROJECT_STATUSES 单源常量，替掉散在校验与表单里的字面量
 * - 2026-11-02: 补 getArchiveBoard()：首页看板与精选的统一取数口，强制只统计已发布日志且零日志项目也上榜
 * - 2026-11-09: V2.0 Step 2：@@unique([userId, slug]) 落地后 where: { slug } 不再是合法唯一键，
 *               公开查询函数（getPublicProjectBySlug / isProjectSlug）改走 userId_slug 复合键，
 *               并新增 resolveUserId(handle) 解析口；过渡期默认 handle='zhanglei' 单租户，Step 3 路由落地后移除默认（裁定 ①）
 * - 2026-11-09: V2.0 Step 3 阶段一：handle 由路由传入、默认参数移除；getArchiveBoard 新增 userId 参数
 *               （租户主页按租户取，不给维持全局口径）；getArchiveBoard/listPublicProjects 的 select 补
 *               user.handle（列表行与精选行拼 /u/[handle]/... 链接用，handle 属公开标识）
 * - 2026-11-09: V2.0 Step 3 阶段二：listPublicProjects 新增 userId 可选参数（sitemap 按租户取项目清单用），
 *               不给维持全局口径（作品页与大厅仍全局）
 * - 2026-11-09: V2.0 Step 4-B：管理侧读写全部按 userId 隔离——listProjectIds/listProjects/getProjectById/
 *               getAdminOverview 加 userId 过滤；saveProject 创建带 userId、更新改 updateMany({id,userId})，
 *               deleteProject 改 deleteMany({id,userId})，0 行命中一律 PRJ_004（跨租户与不存在同表现）
 * - 2026-11-13: 查询去重：resolveUserId / getPublicProjectBySlug 包 React cache()（单请求内只查一次）；
 *               新增 pickFeatured 精选口径单源
 * - 2026-11-16: 评审 G12：getAdminOverview 补近 12 周发布桶（多一次只取 publishedAt 的查询），
 *               分桶规则落在 src/lib/publish-trend.ts 的纯函数，页面只负责画柱
 * - 2026-11-16: 评审 A3：新增 listProjectOptions（后台筛选下拉只要 slug + 名称）
 */
import { Prisma } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  bucketWeeklyPublishes,
  trendWeekStarts,
} from "@/lib/publish-trend";

// 合法取值与 prisma/schema.prisma 的注释保持一致；改这里要同步改 schema 注释
export const PROJECT_KINDS: string[] = ["product", "tool", "site"];
export const PROJECT_STATUSES: string[] = ["WIP", "LIVE", "ARCHIVED"];

export type ProjectInput = {
  id?: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  summary?: string;
  repoUrl?: string;
};

export type SaveProjectResult =
  | { ok: true; id: string }
  | { ok: false; code: "PRJ_002" | "PRJ_004" };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; code: "PRJ_001" | "PRJ_004" };

// 日志表单里的 projectId 是客户端可控值：不存在的外键会一路走到写入并抛 P2003（500），
// 所以动作层先取一次 id 集合做存在性判定，只取 id 一列；4-B 起只取本租户的——
// 别家的项目 id 在这里就不命中，跨租户挂日志被挡在 VAL_001
export async function listProjectIds(userId: string): Promise<string[]> {
  const rows = await db.project.findMany({ where: { userId }, select: { id: true } });

  return rows.map((row) => row.id);
}

export async function listProjects(userId: string) {
  return db.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { logs: true } } },
  });
}

// 项目表没有发布开关，公开范围靠字段白名单控制；日志只统计已发布，避免草稿计数外泄
export async function listPublicProjects(userId?: string) {
  const rows = await db.project.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      summary: true,
      repoUrl: true,
      createdAt: true,
      user: { select: { handle: true } },
      logs: {
        where: { isPublished: true },
        select: { beforeDate: true },
        orderBy: { beforeDate: "desc" },
      },
    },
  });

  // 同 getArchiveBoard：无主行不展示；局部变量收窄后展开（TS 不对交叉类型做属性访问收窄）
  type OwnedProject = (typeof rows)[number] & { user: { handle: string } };
  const owned: OwnedProject[] = [];
  for (const project of rows) {
    const user = project.user;
    if (!user) continue;
    owned.push({ ...project, user });
  }
  return owned;
}

export type ArchiveBoardEntry = {
  name: string;
  slug: string;
  handle: string;
  kind: string;
  status: string;
  summary: string | null;
  count: number;
  // 零日志项目没有"最近更新"可展示，用 null 表示，不拿创建时间冒充
  latest: Date | null;
};

// 看板取数的中间行：比 ArchiveBoardEntry 多 createdAt（排序用）
type ArchiveBoardRow = {
  name: string;
  slug: string;
  handle: string;
  kind: string;
  status: string;
  summary: string | null;
  count: number;
  latest: Date | null;
  createdAt: Date;
};

// 首页看板与精选的唯一取数口：强制只统计已发布日志，零日志项目也要出现在看板里
// Step 3：给了 userId 就按租户取（租户主页），不给维持全局口径（首页）；
// user.handle 随 select 白名单带出——首页精选行要拼 /u/[handle]/projects/[slug] 链接
export async function getArchiveBoard(userId?: string): Promise<ArchiveBoardEntry[]> {
  const projects = await db.project.findMany({
    where: userId ? { userId } : undefined,
    select: {
      name: true,
      slug: true,
      kind: true,
      status: true,
      summary: true,
      createdAt: true,
      user: { select: { handle: true } },
      logs: {
        where: { isPublished: true },
        select: { beforeDate: true },
        orderBy: { beforeDate: "desc" },
      },
    },
  });

  // 可选关系的 include 类型是 user|null：无主行不该存在（回填保证，有则异常），前台不展示——
  // 用 for-loop 跳过（filter 谓词对属性访问不做收窄）
  const rows: ArchiveBoardRow[] = [];
  for (const project of projects) {
    if (!project.user) continue;
    rows.push({
      name: project.name,
      slug: project.slug,
      handle: project.user.handle,
      kind: project.kind,
      status: project.status,
      summary: project.summary,
      count: project.logs.length,
      latest: project.logs[0]?.beforeDate ?? null,
      createdAt: project.createdAt,
    });
  }

  rows.sort((a, b) => {
    if (a.latest && b.latest) {
      return b.latest.getTime() - a.latest.getTime();
    }

    if (a.latest) {
      return -1;
    }

    if (b.latest) {
      return 1;
    }

    // 两边都还没发布过日志：按建项时间倒序排在后面
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    handle: row.handle,
    kind: row.kind,
    status: row.status,
    summary: row.summary,
    count: row.count,
    latest: row.latest,
  }));
}

// 精选口径已抽到 src/lib/featured.ts（纯函数、可单测）；这里再导出，页面引用路径不变
export { pickFeatured } from "@/lib/featured";

// cache()：单请求内元信息与页面共享同一次查询，不是跨请求缓存。
// handle 走关系过滤（不再先查一次 User 拿 userId）——与 logs.ts 的详情查询同口径，省一次往返
export const getPublicProjectBySlug = cache(async (slug: string, handle: string) => {
  return db.project.findFirst({
    where: { slug, user: { handle } },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      summary: true,
      repoUrl: true,
      createdAt: true,
    },
  });
});

// 后台筛选用的项目选项（只 slug + 名称）：与 listProjects 分开，避免为了一个下拉
// 把每个项目的日志计数一起查回来
export async function listProjectOptions(
  userId: string,
): Promise<{ slug: string; name: string }[]> {
  return db.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true },
  });
}

// 后台编辑回填用：id 来自 URL，带上 userId 后别家的项目查不到（回落新建表单，不泄露存在性）
export async function getProjectById(id: string, userId: string) {
  return db.project.findFirst({ where: { id, userId } });
}

// 公开查询的 userId 解析口（不存在返回 null）；cache：单请求内同一 handle 只查一次
export const resolveUserId = cache(async (handle: string) => {
  const user = await db.user.findUnique({
    where: { handle },
    select: { id: true },
  });

  return user?.id ?? null;
});

// Proxy 前置判定只关心 slug 命中与否；handle 走关系过滤，不再先查一次 User（同 logs.ts 口径）
export async function isProjectSlug(slug: string, handle: string) {
  const hit = await db.project.findFirst({
    where: { slug, user: { handle } },
    select: { slug: true },
  });

  return hit !== null;
}

export async function getAdminOverview(userId: string) {
  // 「本周」定义为滚动 7 天（不是自然周）：单人站关心的是“最近有没有产出”，
  // 自然周会让周一早上看板归零，误导性大于信息量
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 趋势按自然周（周一为周首）切 12 桶：看的是“节奏”，与上面的滚动 7 天不是一个问题
  const trendStarts = trendWeekStarts(now);

  const [
    projectCount,
    publishedCount,
    draftCount,
    publishedThisWeek,
    recentDrafts,
    trendRows,
  ] = await Promise.all([
    db.project.count({ where: { userId } }),
    db.trace.count({ where: { userId, isPublished: true } }),
    db.trace.count({ where: { userId, isPublished: false } }),
    db.trace.count({
      where: { userId, isPublished: true, publishedAt: { gte: weekAgo } },
    }),
    db.trace.findMany({
      where: { userId, isPublished: false },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
    }),
    // 只取发布时间一列：12 周窗口外的行不进内存，桶由纯函数切
    db.trace.findMany({
      where: {
        userId,
        isPublished: true,
        publishedAt: { gte: trendStarts[0] },
      },
      select: { publishedAt: true },
    }),
  ]);

  const weeklyPublishes = bucketWeeklyPublishes(
    trendRows.flatMap((row) => (row.publishedAt ? [row.publishedAt] : [])),
    now,
  );

  return {
    projectCount,
    publishedCount,
    draftCount,
    publishedThisWeek,
    recentDrafts,
    trendStarts,
    weeklyPublishes,
  };
}

export async function saveProject(
  input: ProjectInput,
  userId: string,
): Promise<SaveProjectResult> {
  const data = {
    slug: input.slug,
    name: input.name,
    kind: input.kind,
    status: input.status,
    summary: input.summary || null,
    repoUrl: input.repoUrl || null,
  };

  try {
    if (input.id) {
      // 复合条件把跨租户编辑转成 0 行命中：updateMany 不抛 P2025，计数即判据，
      // "不存在"与"不是你的"同报 PRJ_004，不泄露别家项目的存在性
      const updated = await db.project.updateMany({
        where: { id: input.id, userId },
        data,
      });

      if (updated.count === 0) {
        return { ok: false, code: "PRJ_004" };
      }

      return { ok: true, id: input.id };
    }

    const project = await db.project.create({ data: { ...data, userId } });

    return { ok: true, id: project.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "PRJ_002" };
    }

    throw error;
  }
}

export async function deleteProject(
  id: string,
  userId: string,
): Promise<DeleteProjectResult> {
  try {
    const deleted = await db.project.deleteMany({ where: { id, userId } });

    // 0 行 = 不存在或不是自己的，都报资源不存在（与 saveProject 同一口径）
    if (deleted.count === 0) {
      return { ok: false, code: "PRJ_004" };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003 外键约束：项目下还有日志
      if (error.code === "P2003") {
        return { ok: false, code: "PRJ_001" };
      }
    }

    throw error;
  }
}
