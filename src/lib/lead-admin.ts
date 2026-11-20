/**
 * 文件：src/lib/lead-admin.ts
 * 描述：线索后台 DAL：提交入库、列表（分页+状态筛选，含软删除回收）、详情、标记回复、
 *       关闭、软删除；线索提交与状态变更全部写审计
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1）。状态流转 NEW/SPAM→REPLIED→ARCHIVED；
 *               软删除只翻 deletedAt 不动行；ip 只存 ipHash（sha256(ip + LEADS_IP_SALT)，不留明文）
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import {
  leadAuditEntry,
  leadTransitionAllowed,
  type AuditEntry,
  type LeadAuditAction,
} from "@/lib/lead-validate";

export type AdminLead = {
  id: string;
  name: string;
  email: string;
  reqType: string;
  evidenceReq: string | null;
  message: string;
  ipHash: string | null;
  ua: string | null;
  status: "NEW" | "REPLIED" | "ARCHIVED" | "SPAM";
  replyNote: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type LeadStatusFilter = "NEW" | "REPLIED" | "ARCHIVED" | "SPAM" | "ALL";

export type ListLeadsQuery = {
  status?: LeadStatusFilter;
  page: number;
  pageSize: number;
};

export type ListLeadsResult = {
  items: AdminLead[];
  total: number;
  page: number;
  pageSize: number;
};

/** ip → ipHash：只存哈希，盐取 LEADS_IP_SALT（缺盐时按空盐处理，形态仍为 sha256 hex） */
export function computeIpHash(ip: string): string {
  return createHash("sha256")
    .update(`${ip}${process.env.LEADS_IP_SALT ?? ""}`, "utf8")
    .digest("hex");
}

function toAdminLead(row: {
  id: string;
  name: string;
  email: string;
  reqType: string;
  evidenceReq: string | null;
  message: string;
  ipHash: string | null;
  ua: string | null;
  status: "NEW" | "REPLIED" | "ARCHIVED" | "SPAM";
  replyNote: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}): AdminLead {
  return row;
}

const LEAD_SELECT = {
  id: true,
  name: true,
  email: true,
  reqType: true,
  evidenceReq: true,
  message: true,
  ipHash: true,
  ua: true,
  status: true,
  replyNote: true,
  repliedAt: true,
  createdAt: true,
  deletedAt: true,
} as const;

export async function createLead(input: {
  name: string;
  email: string;
  reqType: string;
  evidenceReq: string;
  message: string;
}, ipHash: string, ua: string | null): Promise<{ ok: true; id: string } | { ok: false; code: "LEAD_002" }> {
  const created = await db.lead.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim(),
      reqType: input.reqType.trim(),
      evidenceReq: input.evidenceReq.trim() || null,
      message: input.message.trim(),
      ipHash,
      ua,
      status: "NEW",
    },
    select: { id: true, status: true },
  });

  await recordAudit(
    leadAuditEntry("visitor", "lead.create", created, { reqType: input.reqType.trim() }),
  );

  return { ok: true, id: created.id };
}

export async function listLeads(query: ListLeadsQuery): Promise<ListLeadsResult> {
  const where = query.status && query.status !== "ALL" ? { status: query.status } : {};
  const [rows, total] = await Promise.all([
    db.lead.findMany({
      where,
      select: LEAD_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.lead.count({ where }),
  ]);

  return { items: rows.map(toAdminLead), total, page: query.page, pageSize: query.pageSize };
}

export async function getLead(id: string): Promise<AdminLead | null> {
  const row = await db.lead.findUnique({ where: { id }, select: LEAD_SELECT });
  return row ? toAdminLead(row) : null;
}

async function writeAudit(actorId: string, action: LeadAuditAction, lead: { id: string; status: string }, extra: Record<string, unknown> = {}) {
  const entry: AuditEntry = leadAuditEntry(actorId, action, lead, extra);
  await recordAudit(entry);
}

export async function replyLead(
  id: string,
  replyNote: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "LEAD_003" | "LEAD_004" }> {
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!lead) return { ok: false, code: "LEAD_003" };
  if (!leadTransitionAllowed("reply", lead.status)) return { ok: false, code: "LEAD_004" };

  await db.lead.update({
    where: { id: lead.id },
    data: { status: "REPLIED", replyNote: replyNote.trim() || null, repliedAt: new Date() },
  });
  await writeAudit(actorId, "lead.reply", { id: lead.id, status: "REPLIED" }, { replyNote: replyNote.trim() });
  return { ok: true };
}

export async function closeLead(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "LEAD_003" | "LEAD_004" }> {
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!lead) return { ok: false, code: "LEAD_003" };
  if (!leadTransitionAllowed("close", lead.status)) return { ok: false, code: "LEAD_004" };

  await db.lead.update({ where: { id: lead.id }, data: { status: "ARCHIVED" } });
  await writeAudit(actorId, "lead.close", { id: lead.id, status: "ARCHIVED" });
  return { ok: true };
}

export async function softDeleteLead(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "LEAD_003" }> {
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true, status: true, deletedAt: true } });
  if (!lead) return { ok: false, code: "LEAD_003" };
  if (lead.deletedAt) return { ok: true };

  await db.lead.update({ where: { id: lead.id }, data: { deletedAt: new Date() } });
  await writeAudit(actorId, "lead.delete", { id: lead.id, status: lead.status });
  return { ok: true };
}
