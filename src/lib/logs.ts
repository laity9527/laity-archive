/**
 * 文件：src/lib/logs.ts
 * 描述：前台日志数据访问封装，内部强制 isPublished: true（草稿隔离）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表查询），Phase 2 补齐详情查询
 */
import { db } from "@/lib/db";

export async function getSafeLogs() {
  return db.log.findMany({
    where: { isPublished: true },
    orderBy: { beforeDate: "desc" },
    include: { project: { select: { name: true, slug: true } } },
  });
}