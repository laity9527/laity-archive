/**
 * 文件：src/lib/series-store.ts
 * 描述：Series 实体的写入侧：稳定 slug、按 (userId, slug) 幂等创建、创建审计
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V4 P2 Series 实体，兼容迁移）。Log.series 字符串继续保留用于旧 URL/展示，
 *               新写入同时落 seriesId；slug 由名称哈希生成，避免中文名无法直接做 URL 键。
 *               创建成功写 `series.create` 审计；重复创建不写，避免每次保存都刷审计。
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { seriesSlug } from "@/lib/series";

/** 幂等创建系列并返回 id；名称只去首尾空白，空串返回 null */
export async function ensureSeries(
  userId: string,
  name: string,
  opts: { audit?: boolean } = {},
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const slug = seriesSlug(trimmed);
  const existing = await db.series.findUnique({
    where: { userId_slug: { userId, slug } },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await db.series.create({
      data: { userId, slug, name: trimmed },
      select: { id: true },
    });

    if (opts.audit !== false) {
      await recordAudit({
        actorId: userId,
        action: "series.create",
        targetType: "series",
        targetId: created.id,
        meta: { name: trimmed },
      });
    }

    return created.id;
  } catch (error) {
    // 并发创建撞唯一键：读回已存在行，不把唯一冲突升级成保存失败
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const row = await db.series.findUnique({
        where: { userId_slug: { userId, slug } },
        select: { id: true },
      });
      return row?.id ?? null;
    }

    throw error;
  }
}
