/**
 * 文件：src/lib/logs.ts
 * 描述：前台日志数据访问封装，内部强制 isPublished: true（草稿隔离）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表查询），Phase 2 补齐详情查询
 * - 2026-10-30: 列表支持 project/tag 筛选；新增 getSafeLogBySlug 详情查询
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
