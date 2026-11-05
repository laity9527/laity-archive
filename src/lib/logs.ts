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
 */
import { db } from "@/lib/db";

export type SafeLogFilter = {
  project?: string;
  tag?: string;
  // 只要前 N 条时交给数据库取，而不是全表捞回内存再切（首页用）
  take?: number;
};

const projectSelect = {
  select: { name: true, slug: true, kind: true, status: true },
} as const;

export async function getSafeLogs(filter: SafeLogFilter = {}) {
  return db.log.findMany({
    where: {
      isPublished: true,
      ...(filter.project ? { project: { slug: filter.project } } : {}),
      ...(filter.tag ? { tags: { has: filter.tag } } : {}),
    },
    orderBy: { beforeDate: "desc" },
    // 首页只要最新三条，原先把全部已发布日志取回内存再 slice(0,3)
    ...(filter.take ? { take: filter.take } : {}),
    include: { project: projectSelect },
  });
}

export async function getSafeLogBySlug(slug: string) {
  return db.log.findFirst({
    where: { slug, isPublished: true },
    include: { project: projectSelect },
  });
}

// Proxy 前置判定只关心命中与否，Select id 让这次查询停留在索引层面
export async function isPublishedLogSlug(slug: string) {
  const hit = await db.log.findFirst({
    where: { slug, isPublished: true },
    select: { id: true },
  });

  return hit !== null;
}

export async function getAdminLogById(id: string) {
  return db.log.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
}

