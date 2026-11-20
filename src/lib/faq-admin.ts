/**
 * 文件：src/lib/faq-admin.ts
 * 描述：FAQ 后台 DAL：列表（含回收站）、保存（新建/编辑/排序）、启停、软删除；写操作记审计
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 4）。字段口径 question/answer/sort/enabled/deletedAt；
 *               listEnabledFaqs 供前台 /faq 只渲染启用项（SQL 层过滤）
 */
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import {
  faqAuditEntry,
  validateFaqInput,
  type FaqAuditAction,
} from "@/lib/faq-validate";

export type AdminFaq = {
  id: string;
  question: string;
  answer: string;
  sort: number;
  enabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const FAQ_SELECT = {
  id: true,
  question: true,
  answer: true,
  sort: true,
  enabled: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toAdminFaq(row: {
  id: string;
  question: string;
  answer: string;
  sort: number;
  enabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminFaq {
  return row;
}

export type ListFaqsQuery = { page: number; pageSize: number };

export type ListFaqsResult = {
  items: AdminFaq[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listFaqs(query: ListFaqsQuery): Promise<ListFaqsResult> {
  const [rows, total] = await Promise.all([
    db.faq.findMany({
      select: FAQ_SELECT,
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.faq.count(),
  ]);

  return { items: rows.map(toAdminFaq), total, page: query.page, pageSize: query.pageSize };
}

export async function getFaq(id: string): Promise<AdminFaq | null> {
  const row = await db.faq.findUnique({ where: { id }, select: FAQ_SELECT });
  return row ? toAdminFaq(row) : null;
}

/** 前台口径：只启用、未软删，按 sort 升序（同值按创建时间，稳定序） */
export async function listEnabledFaqs(): Promise<AdminFaq[]> {
  const rows = await db.faq.findMany({
    where: { enabled: true, deletedAt: null },
    select: FAQ_SELECT,
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(toAdminFaq);
}

export type SaveFaqResult =
  | { ok: true; id: string }
  | { ok: false; code: "FAQ_001" | "FAQ_002" | "FAQ_004" };

export async function saveFaq(
  input: { id?: string; question: string; answer: string; sort: number },
  actorId: string,
): Promise<SaveFaqResult> {
  const validation = validateFaqInput({ question: input.question, answer: input.answer });

  if (!validation.ok) {
    return { ok: false, code: "FAQ_002" };
  }

  if (!Number.isInteger(input.sort)) {
    return { ok: false, code: "FAQ_002" };
  }

  if (input.id) {
    const updated = await db.faq.updateMany({
      where: { id: input.id },
      data: {
        question: input.question.trim(),
        answer: input.answer.trim(),
        sort: input.sort,
      },
    });

    if (updated.count === 0) return { ok: false, code: "FAQ_004" };

    await recordAudit(
      faqAuditEntry(actorId, "faq.update", { id: input.id }, { question: input.question.trim(), sort: input.sort }),
    );
    return { ok: true, id: input.id };
  }

  const created = await db.faq.create({
    data: {
      question: input.question.trim(),
      answer: input.answer.trim(),
      sort: input.sort,
      enabled: false,
    },
    select: { id: true },
  });

  await recordAudit(faqAuditEntry(actorId, "faq.create", created, { question: input.question.trim() }));
  return { ok: true, id: created.id };
}

async function writeAudit(actorId: string, action: FaqAuditAction, faq: { id: string }, extra: Record<string, unknown> = {}) {
  await recordAudit(faqAuditEntry(actorId, action, faq, extra));
}

export async function setFaqEnabled(
  id: string,
  enabled: boolean,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "FAQ_003" | "FAQ_004" }> {
  const faq = await db.faq.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!faq) return { ok: false, code: "FAQ_003" };
  if (faq.deletedAt) return { ok: false, code: "FAQ_004" };

  await db.faq.update({ where: { id: faq.id }, data: { enabled } });
  await writeAudit(actorId, "faq.enabled", { id: faq.id }, { enabled });
  return { ok: true };
}

export async function softDeleteFaq(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "FAQ_003" }> {
  const faq = await db.faq.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!faq) return { ok: false, code: "FAQ_003" };
  if (faq.deletedAt) return { ok: true };

  await db.faq.update({ where: { id: faq.id }, data: { deletedAt: new Date() } });
  await writeAudit(actorId, "faq.delete", { id: faq.id });
  return { ok: true };
}
