/**
 * 文件：src/lib/topic-admin.ts
 * 描述：后台主题管理：列表（含关联日志数）、保存（新建/改名/描述/排序）、删除；删除前校验关联 Trace 数
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 7）。Topic 为全局实体（不带 userId）；slug 创建后不变；
 *               有关联日志（TraceTopic 连接行）时拒绝删除（TOPIC_003），避免级联清掉连接；写操作记审计
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export type AdminTopic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  count: number;
};

export type TopicInput = {
  id?: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type SaveTopicResult =
  | { ok: true; id: string }
  | { ok: false; code: "TOPIC_001" | "TOPIC_002" | "TOPIC_004" };

export type DeleteTopicResult =
  | { ok: true }
  | { ok: false; code: "TOPIC_003" | "TOPIC_004" };

function topicSlug(name: string): string {
  return `topic-${createHash("sha256").update(name.trim()).digest("hex").slice(0, 16)}`;
}

export async function listAdminTopics(): Promise<AdminTopic[]> {
  const rows = await db.topic.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      sortOrder: true,
      _count: { select: { logs: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    count: row._count.logs,
  }));
}

export async function getAdminTopic(id: string) {
  return db.topic.findUnique({ where: { id } });
}

export async function saveTopic(
  input: TopicInput,
  actorId: string,
): Promise<SaveTopicResult> {
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name || name.length > 40) return { ok: false, code: "TOPIC_002" };
  if (description.length > 120) return { ok: false, code: "TOPIC_002" };
  if (!Number.isInteger(input.sortOrder)) return { ok: false, code: "TOPIC_002" };

  if (input.id) {
    const updated = await db.topic.updateMany({
      where: { id: input.id },
      data: { name, description: description || null, sortOrder: input.sortOrder },
    });
    if (updated.count === 0) return { ok: false, code: "TOPIC_004" };

    await recordAudit({
      actorId,
      action: "topic.update",
      targetType: "topic",
      targetId: input.id,
      meta: { name, sortOrder: input.sortOrder },
    });
    return { ok: true, id: input.id };
  }

  try {
    const created = await db.topic.create({
      data: {
        name,
        slug: topicSlug(name),
        description: description || null,
        sortOrder: input.sortOrder,
      },
      select: { id: true },
    });
    await recordAudit({
      actorId,
      action: "topic.create",
      targetType: "topic",
      targetId: created.id,
      meta: { name },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "TOPIC_001" };
    }
    throw error;
  }
}

export async function deleteTopic(
  id: string,
  actorId: string,
): Promise<DeleteTopicResult> {
  const row = await db.topic.findUnique({
    where: { id },
    select: { id: true, _count: { select: { logs: true } } },
  });
  if (!row) return { ok: false, code: "TOPIC_004" };
  if (row._count.logs > 0) return { ok: false, code: "TOPIC_003" };

  await db.topic.delete({ where: { id: row.id } });
  await recordAudit({
    actorId,
    action: "topic.delete",
    targetType: "topic",
    targetId: row.id,
  });
  return { ok: true };
}
