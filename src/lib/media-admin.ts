/**
 * 文件：src/lib/media-admin.ts
 * 描述：媒体库后台 DAL：列表（按轨迹筛选、分页、含回收站）、详情、上传登记、
 *       绑定/解绑轨迹、isEvidence 标记、软删除；全部写操作记审计
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2）。绑定校验轨迹归属本租户；软删除只翻 deletedAt；
 *               listEvidenceMediaHashes 供发布时把附属媒体哈希清单冻结进版本行
 */
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { mediaAuditEntry, type MediaAuditAction } from "@/lib/media-whitelist";

export type AdminMedia = {
  id: string;
  fileName: string;
  originalName: string | null;
  ossKey: string;
  ossUrl: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  traceId: string | null;
  isEvidence: boolean;
  hash: string | null;
  deletedAt: Date | null;
  createdAt: Date;
};

const MEDIA_SELECT = {
  id: true,
  fileName: true,
  originalName: true,
  ossKey: true,
  ossUrl: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  alt: true,
  traceId: true,
  isEvidence: true,
  hash: true,
  deletedAt: true,
  createdAt: true,
} as const;

function toAdminMedia(row: {
  id: string;
  fileName: string;
  originalName: string | null;
  ossKey: string;
  ossUrl: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  traceId: string | null;
  isEvidence: boolean;
  hash: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}): AdminMedia {
  return row;
}

export type ListMediaQuery = {
  traceId?: string;
  page: number;
  pageSize: number;
};

export type ListMediaResult = {
  items: AdminMedia[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listMedia(query: ListMediaQuery): Promise<ListMediaResult> {
  const where = query.traceId ? { traceId: query.traceId } : {};
  const [rows, total] = await Promise.all([
    db.media.findMany({
      where,
      select: MEDIA_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.media.count({ where }),
  ]);

  return { items: rows.map(toAdminMedia), total, page: query.page, pageSize: query.pageSize };
}

export async function getMedia(id: string): Promise<AdminMedia | null> {
  const row = await db.media.findUnique({ where: { id }, select: MEDIA_SELECT });
  return row ? toAdminMedia(row) : null;
}

export async function createMedia(input: {
  fileName: string;
  originalName: string;
  ossKey: string;
  ossUrl: string;
  mimeType: string;
  size: number;
  hash: string;
}, actorId: string): Promise<{ ok: true; id: string } | { ok: false; code: "MEDIA_003" }> {
  const created = await db.media.create({
    data: {
      fileName: input.fileName,
      originalName: input.originalName || null,
      ossKey: input.ossKey,
      ossUrl: input.ossUrl,
      mimeType: input.mimeType,
      size: input.size,
      hash: input.hash,
      isEvidence: false,
    },
    select: { id: true },
  });

  await recordAudit(
    mediaAuditEntry(actorId, "media.upload", created, {
      fileName: input.fileName,
      size: input.size,
      hash: input.hash.slice(0, 8),
    }),
  );

  return { ok: true, id: created.id };
}

async function writeAudit(actorId: string, action: MediaAuditAction, media: { id: string }, extra: Record<string, unknown> = {}) {
  await recordAudit(mediaAuditEntry(actorId, action, media, extra));
}

export async function bindMedia(
  id: string,
  traceId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "MEDIA_003" | "MEDIA_004" }> {
  const media = await db.media.findUnique({ where: { id }, select: { id: true, deletedAt: true, traceId: true } });
  if (!media) return { ok: false, code: "MEDIA_003" };
  if (media.deletedAt) return { ok: false, code: "MEDIA_004" };

  // 绑定目标必须是本租户名下的轨迹（跨租户与不存在同判）
  const trace = await db.trace.findFirst({ where: { id: traceId, userId: actorId }, select: { id: true } });
  if (!trace) return { ok: false, code: "MEDIA_003" };

  await db.media.update({ where: { id: media.id }, data: { traceId } });
  await writeAudit(actorId, "media.bind", { id: media.id }, { traceId });
  return { ok: true };
}

export async function unbindMedia(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "MEDIA_003" | "MEDIA_004" }> {
  const media = await db.media.findUnique({ where: { id }, select: { id: true, deletedAt: true, traceId: true } });
  if (!media) return { ok: false, code: "MEDIA_003" };
  if (media.deletedAt) return { ok: false, code: "MEDIA_004" };
  if (!media.traceId) return { ok: false, code: "MEDIA_004" };

  await db.media.update({ where: { id: media.id }, data: { traceId: null } });
  await writeAudit(actorId, "media.unbind", { id: media.id }, { fromTraceId: media.traceId });
  return { ok: true };
}

export async function setMediaEvidence(
  id: string,
  isEvidence: boolean,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "MEDIA_003" | "MEDIA_004" }> {
  const media = await db.media.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!media) return { ok: false, code: "MEDIA_003" };
  if (media.deletedAt) return { ok: false, code: "MEDIA_004" };

  await db.media.update({ where: { id: media.id }, data: { isEvidence } });
  await writeAudit(actorId, "media.evidence", { id: media.id }, { isEvidence });
  return { ok: true };
}

export async function softDeleteMedia(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: "MEDIA_003" }> {
  const media = await db.media.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!media) return { ok: false, code: "MEDIA_003" };
  if (media.deletedAt) return { ok: true };

  await db.media.update({ where: { id: media.id }, data: { deletedAt: new Date() } });
  await writeAudit(actorId, "media.delete", { id: media.id });
  return { ok: true };
}

/**
 * 发布用：该轨迹下纳入证据快照的媒体哈希清单（isEvidence 且未软删且有哈希，按哈希升序）。
 * 返回空数组表示无附属证据——正文哈希口径不受影响。
 */
export async function listEvidenceMediaHashes(traceId: string): Promise<string[]> {
  const rows = await db.media.findMany({
    where: { traceId, isEvidence: true, deletedAt: null, hash: { not: null } },
    select: { hash: true },
    orderBy: { hash: "asc" },
  });

  return rows.map((row) => row.hash ?? "").filter(Boolean);
}

/** 绑定下拉的轨迹选项：本租户全部轨迹（含草稿），只取标题与 slug */
export async function listTraceOptions(userId: string): Promise<{ id: string; title: string; slug: string }[]> {
  const rows = await db.trace.findMany({
    where: { userId },
    select: { id: true, title: true, slug: true },
    orderBy: { beforeDate: "desc" },
    take: 200,
  });

  return rows;
}
