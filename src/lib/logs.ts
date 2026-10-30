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
 */
import { db } from "@/lib/db";

export type SafeLogFilter = {
  project?: string;
  tag?: string;
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

// 管理侧查询：后台要看草稿，这里故意不过滤 isPublished；前台仍只能走上面的封装
export async function listAdminLogs() {
  return db.log.findMany({
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { name: true } } },
  });
}

export async function getAdminLogById(id: string) {
  return db.log.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
}
