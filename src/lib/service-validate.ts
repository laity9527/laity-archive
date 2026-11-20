/**
 * 文件：src/lib/service-validate.ts
 * 描述：服务介绍的纯函数层：字段校验、前台排序过滤口径、审计条目构造——不碰数据库，单测直接钉住
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 3）。排序过滤口径与 DAL 的 SQL 口径一致（enabled 且未软删，按 sort 升序）
 */
import { Prisma } from "@prisma/client";

export const SERVICE_LIMITS = {
  title: 60,
  summary: 200,
  body: 20000,
} as const;

export type ServiceField = "title" | "summary" | "body";

export type ServiceValidation = { ok: true } | { ok: false; field: ServiceField };

export function validateServiceInput(input: {
  title: string;
  summary: string;
  body: string;
}): ServiceValidation {
  if (input.title.trim().length === 0 || input.title.trim().length > SERVICE_LIMITS.title) {
    return { ok: false, field: "title" };
  }
  if (input.summary.trim().length > SERVICE_LIMITS.summary) {
    return { ok: false, field: "summary" };
  }
  if (input.body.trim().length > SERVICE_LIMITS.body) {
    return { ok: false, field: "body" };
  }
  return { ok: true };
}

/** 前台排序过滤口径：只保留启用且未软删，按 sort 升序（同值再按创建时间，保证稳定序） */
export function orderEnabledServices<T extends { enabled: boolean; sort: number; createdAt: Date }>(
  items: T[],
): T[] {
  return items
    .filter((item) => item.enabled)
    .slice()
    .sort((a, b) => a.sort - b.sort || a.createdAt.getTime() - b.createdAt.getTime());
}

export type ServiceAuditAction = "service.create" | "service.update" | "service.enabled" | "service.delete";

export function serviceAuditEntry(
  actorId: string,
  action: ServiceAuditAction,
  service: { id: string },
  extra: Record<string, unknown> = {},
): { actorId: string; action: string; targetType: string; targetId: string; meta: Prisma.InputJsonValue } {
  return {
    actorId,
    action,
    targetType: "Service",
    targetId: service.id,
    meta: extra as Prisma.InputJsonValue,
  };
}
