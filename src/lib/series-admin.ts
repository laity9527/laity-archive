/**
 * 文件：src/lib/series-admin.ts
 * 描述：后台系列管理：列表、保存（新建/改名与摘要）、删除；改名不改 slug，删除前检查日志
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V4 P2 Series 第三阶段）。slug 由名称哈希生成且创建后不变；
 *               有日志的系列拒绝删除（SERIES_003），避免静默 SetNull；写操作记审计。
 * - 2026-11-18: V5 Phase 1 模型改名：Series 关系字段 logs→traces（Schema Log→Trace 机械替换）
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { seriesSlug } from "@/lib/series";

export type AdminSeries = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  count: number;
};

export type SeriesInput = {
  id?: string;
  name: string;
  summary: string;
};

export type SaveSeriesResult =
  | { ok: true; id: string }
  | { ok: false; code: "SERIES_001" | "SERIES_002" };

export type DeleteSeriesResult =
  | { ok: true }
  | { ok: false; code: "SERIES_003" | "SERIES_004" };

export async function listAdminSeries(userId: string): Promise<AdminSeries[]> {
  const rows = await db.series.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      _count: { select: { traces: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    count: row._count.traces,
  }));
}

export async function getAdminSeries(id: string, userId: string) {
  return db.series.findFirst({ where: { id, userId } });
}

export async function saveSeries(
  input: SeriesInput,
  userId: string,
): Promise<SaveSeriesResult> {
  const name = input.name.trim();
  const summary = input.summary.trim();

  if (!name || name.length > 40) return { ok: false, code: "SERIES_002" };
  if (summary.length > 120) return { ok: false, code: "SERIES_002" };

  if (input.id) {
    const updated = await db.series.updateMany({
      where: { id: input.id, userId },
      data: { name, summary: summary || null },
    });
    if (updated.count === 0) return { ok: false, code: "SERIES_001" };

    await recordAudit({
      actorId: userId,
      action: "series.update",
      targetType: "series",
      targetId: input.id,
      meta: { name },
    });
    return { ok: true, id: input.id };
  }

  try {
    const created = await db.series.create({
      data: { userId, name, slug: seriesSlug(name), summary: summary || null },
      select: { id: true },
    });
    await recordAudit({
      actorId: userId,
      action: "series.create",
      targetType: "series",
      targetId: created.id,
      meta: { name },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "SERIES_001" };
    }
    throw error;
  }
}

export async function deleteSeries(
  id: string,
  userId: string,
): Promise<DeleteSeriesResult> {
  const row = await db.series.findFirst({
    where: { id, userId },
    select: { id: true, _count: { select: { traces: true } } },
  });
  if (!row) return { ok: false, code: "SERIES_004" };
  if (row._count.traces > 0) return { ok: false, code: "SERIES_003" };

  await db.series.delete({ where: { id: row.id } });
  await recordAudit({
    actorId: userId,
    action: "series.delete",
    targetType: "series",
    targetId: row.id,
  });
  return { ok: true };
}
