/**
 * 文件：src/lib/lead-validate.ts
 * 描述：线索提交的纯校验函数（不碰数据库，node --test 可直接钉住）：
 *       姓名/邮箱/需求类型/留言必填与长度，希望留存的证据可空
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1）。从 lead-admin 抽出使校验可被单测直接引用
 *               （lead-admin 内部走 @/ 别名，测试引不到）
 * - 2026-11-19: 补 leadAuditEntry 纯构造器：DAL 写审计统一走它，动作与目标形态可被单测断言
 */
export type LeadField = "name" | "email" | "reqType" | "message" | "evidenceReq";

export type LeadInput = {
  name: string;
  email: string;
  reqType: string;
  evidenceReq: string;
  message: string;
};

export type LeadValidation = { ok: true } | { ok: false; field: LeadField };

export const LEAD_LIMITS = {
  name: 40,
  email: 100,
  reqType: 30,
  message: 2000,
  evidenceReq: 200,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadInput(input: LeadInput): LeadValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const reqType = input.reqType.trim();
  const message = input.message.trim();
  const evidenceReq = input.evidenceReq.trim();

  if (name.length === 0 || name.length > LEAD_LIMITS.name) {
    return { ok: false, field: "name" };
  }

  if (email.length === 0 || email.length > LEAD_LIMITS.email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: "email" };
  }

  if (reqType.length === 0 || reqType.length > LEAD_LIMITS.reqType) {
    return { ok: false, field: "reqType" };
  }

  if (message.length === 0 || message.length > LEAD_LIMITS.message) {
    return { ok: false, field: "message" };
  }

  if (evidenceReq.length > LEAD_LIMITS.evidenceReq) {
    return { ok: false, field: "evidenceReq" };
  }

  return { ok: true };
}

import { Prisma } from "@prisma/client";

// 审计条目构造（纯函数）：DAL 写审计时统一走这里，单测可直接断言动作与目标形态
export type LeadTransition = "reply" | "close";

/** 状态流转判据（纯函数）：回复只允许新线索/垃圾；关闭不允许已在关闭态 */
export function leadTransitionAllowed(action: LeadTransition, status: string): boolean {
  if (action === "reply") {
    return status === "NEW" || status === "SPAM";
  }

  return status !== "ARCHIVED";
}

// 防刷（V5 Phase 2 收尾自检，负责人确认补齐②）：蜜罐静默成功 + 最短填写时长
export const LEAD_MIN_FILL_MS = 3000;

export type LeadAntiSpamResult =
  | { verdict: "ok" } // 正常提交
  | { verdict: "silent" } // 蜜罐命中：回成功但不入库，不提示差异
  | { verdict: "too_fast" }; // 填写时长不足：拒收（LEAD_005）

export function leadAntiSpam(input: {
  website: string;
  renderedAt: number;
  now: number;
}): LeadAntiSpamResult {
  if (input.website.trim().length > 0) {
    return { verdict: "silent" };
  }

  if (!Number.isFinite(input.renderedAt) || input.renderedAt <= 0 || input.now - input.renderedAt < LEAD_MIN_FILL_MS) {
    return { verdict: "too_fast" };
  }

  return { verdict: "ok" };
}

export type AuditEntry = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Prisma.InputJsonValue;
};

export type LeadAuditAction = "lead.create" | "lead.reply" | "lead.close" | "lead.delete";

export function leadAuditEntry(
  actorId: string,
  action: LeadAuditAction,
  lead: { id: string; status: string },
  extra: Record<string, unknown> = {},
): AuditEntry {
  return {
    actorId,
    action,
    targetType: "Lead",
    targetId: lead.id,
    meta: { status: lead.status, ...extra } as Prisma.InputJsonValue,
  };
}
