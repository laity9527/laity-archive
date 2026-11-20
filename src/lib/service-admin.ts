/**
 * 文件：src/lib/service-admin.ts
 * 描述：服务介绍后台 DAL：列表（含回收站）、保存（新建/编辑/排序）、启停、软删除；写操作记审计
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 3）。字段口径 title/summary/body/sort/enabled/deletedAt；
 *               listEnabledServices 供前台 /services 只渲染启用项（SQL 层过滤，不把禁用项带出库）
 */
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import {
  serviceAuditEntry,
  validateServiceInput,
  type ServiceAuditAction,
} from "@/lib/service-validate";

export type AdminService = {
  id: string;
  title: string;
  summary: string;
  body: string;
  sort: number;
  enabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const SERVICE_SELECT = {
  id: true,
  title: true,
  summary: true,
  body: true,
  sort: true,
  enabled: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toAdminService(row: {
  id: string;
  title: string;
  summary: string;
  body: string;
  sort: number;
  enabled: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminService {
  return row;
}

export type ListServicesQuery = { page: number; pageSize: number };

export type ListServicesResult = {
  items: AdminService[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listServices(query: ListServicesQuery): Promise<ListServicesResult> {
  const [rows, total] = await Promise.all([
    db.service.findMany({
      select: SERVICE_SELECT,
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.service.count(),
  ]);

  return { items: rows.map(toAdminService), total, page: query.page, pageSize: query.pageSize };
}

export async function getService(id: string): Promise<AdminService | null> {
  const row = await db.service.findUnique({ where: { id }, select: SERVICE_SELECT });
  return row ? toAdminService(row) : null;
}

/** 前台口径：只启用、未软删，按 sort 升序（同值按创建时间，稳定序） */
export async function listEnabledServices(): Promise<AdminService[]> {
  const rows = await db.service.findMany({
    where: { enabled: true, deletedAt: null },
    select: SERVICE_SELECT,
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(toAdminService);
}

export type SaveServiceResult =
  | { ok: true; id: string }
  | { ok: false; code: "SERVICE_001" | "SERVICE_002" | "SERVICE_004" };

export async function saveService(
  input: { id?: string; title: string; summary: string; body: string; sort: number },
  actorId: string,
): Promise<SaveServiceResult> {
  const validation = validateServiceInput({
    title: input.title,
    summary: input.summary,
    body: input.body,
  });

  if (!validation.ok) {
    return { ok: false, code: "SERVICE_002" };
  }

  if (!Number.isInteger(input.sort)) {
    return { ok: false, code: "SERVICE_002" };
  }

  if (input.id) {
    const updated = await db.service.updateMany({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        summary: input.summary.trim(),
        body: input.body.trim(),
        sort: input.sort,
      },
    });

    if (updated.count === 0) return { ok: false, code: "SERVICE_004" };

    await recordAudit(
      serviceAuditEntry(actorId, "service.update", { id: input.id }, { title: input.title.trim(), sort: input.sort }),
    );
    return { ok: true, id: input.id };
  }

  const created = await db.service.create({
    data: {
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      sort: input.sort,
      enabled: false,
    },
    select: { id: true },
  });

  await recordAudit(serviceAuditEntry(actorId, "service.create", created, { title: input.title.trim() }));
  return { ok: true, id: created.id };
}

async function writeAudit(actorId: string, action: ServiceAuditAction, service: { id: string }, extra: Record<string, unknown> = {}) {
  await recordAudit(serviceAuditEntry(actorId, action, service, extra));
}

export async function setServiceEnabled(
  id: string,
  enabled: boolean,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "SERVICE_003" | "SERVICE_004" }> {
  const service = await db.service.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!service) return { ok: false, code: "SERVICE_003" };
  if (service.deletedAt) return { ok: false, code: "SERVICE_004" };

  await db.service.update({ where: { id: service.id }, data: { enabled } });
  await writeAudit(actorId, "service.enabled", { id: service.id }, { enabled });
  return { ok: true };
}

export async function softDeleteService(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "SERVICE_003" }> {
  const service = await db.service.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!service) return { ok: false, code: "SERVICE_003" };
  if (service.deletedAt) return { ok: true };

  await db.service.update({ where: { id: service.id }, data: { deletedAt: new Date() } });
  await writeAudit(actorId, "service.delete", { id: service.id });
  return { ok: true };
}
