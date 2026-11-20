/**
 * 文件：src/lib/faq-validate.ts
 * 描述：FAQ 的纯函数层：字段校验、前台排序过滤口径、审计条目构造——不碰数据库，单测直接钉住
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 4）。排序过滤口径与 DAL 的 SQL 口径一致（enabled 且未软删，按 sort 升序）
 */
import { Prisma } from "@prisma/client";

export const FAQ_LIMITS = {
  question: 200,
  answer: 20000,
} as const;

export type FaqField = "question" | "answer";

export type FaqValidation = { ok: true } | { ok: false; field: FaqField };

export function validateFaqInput(input: {
  question: string;
  answer: string;
}): FaqValidation {
  if (input.question.trim().length === 0 || input.question.trim().length > FAQ_LIMITS.question) {
    return { ok: false, field: "question" };
  }
  if (input.answer.trim().length > FAQ_LIMITS.answer) {
    return { ok: false, field: "answer" };
  }
  return { ok: true };
}

/** 前台排序过滤口径：只保留启用且未软删，按 sort 升序（同值再按创建时间，保证稳定序） */
export function orderEnabledFaqs<T extends { enabled: boolean; sort: number; createdAt: Date }>(
  items: T[],
): T[] {
  return items
    .filter((item) => item.enabled)
    .slice()
    .sort((a, b) => a.sort - b.sort || a.createdAt.getTime() - b.createdAt.getTime());
}

export type FaqAuditAction = "faq.create" | "faq.update" | "faq.enabled" | "faq.delete";

export function faqAuditEntry(
  actorId: string,
  action: FaqAuditAction,
  faq: { id: string },
  extra: Record<string, unknown> = {},
): { actorId: string; action: string; targetType: string; targetId: string; meta: Prisma.InputJsonValue } {
  return {
    actorId,
    action,
    targetType: "Faq",
    targetId: faq.id,
    meta: extra as Prisma.InputJsonValue,
  };
}
