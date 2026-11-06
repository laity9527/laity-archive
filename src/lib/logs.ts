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

// 首页「最新日志」口径：beforeDate 是"哪天做的决策"，publishedAt 才是"什么时候写出来的"，
// 访客在这里要读最新动态，所以按发布时间排——BEFORE 填几天前都不影响它顶到最前（D13 修订）
export async function getLatestLogs(take: number) {
  return db.log.findMany({
    where: { isPublished: true, publishedAt: { not: null } },
    // 实测 11 篇批量入库里有 10 篇 publishedAt 完全相同（同一秒），
    // 只按它排序时前三条会退化成不确定子集，再用 beforeDate 兜底成确定顺序
    orderBy: [{ publishedAt: "desc" }, { beforeDate: "desc" }],
    take,
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

