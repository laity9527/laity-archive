/**
 * 文件：src/lib/publish.ts
 * 描述：日志写入与发布存证：保存草稿、按 D5 口径计算 SHA-256、发布时写入哈希与服务器时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: 哈希口径改从 src/lib/content-hash.ts 引入，本文件不再自带一份
 */
import { Prisma } from "@prisma/client";
import { computeContentHash } from "@/lib/content-hash";
import { db } from "@/lib/db";

export type LogInput = {
  id?: string;
  projectId: string;
  slug: string;
  title: string;
  tags: string[];
  beforeContent: string;
  afterContent?: string;
  beforeDate: Date;
  afterDate?: Date;
  lessonLearned?: string;
};

export type SaveLogResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; code: "LOG_001" | "LOG_002" };

export type PublishLogResult =
  | { ok: true; contentHash: string; slug: string }
  | { ok: false; code: "LOG_002" };

export type UnpublishLogResult =
  | { ok: true; slug: string }
  | { ok: false; code: "LOG_002" };

// datetime-local 输入框要本地时间字符串，存库仍是 UTC
export function toDateTimeLocal(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(value);

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export async function saveLog(input: LogInput): Promise<SaveLogResult> {
  const data = {
    projectId: input.projectId,
    slug: input.slug,
    title: input.title,
    tags: input.tags,
    beforeContent: input.beforeContent,
    afterContent: input.afterContent || null,
    beforeDate: input.beforeDate,
    afterDate: input.afterDate ?? null,
    lessonLearned: input.lessonLearned || null,
  };

  try {
    if (input.id) {
      const existing = await db.log.findUnique({
        where: { id: input.id },
        select: { isPublished: true },
      });

      if (!existing) {
        return { ok: false, code: "LOG_002" };
      }

      // 已发布的日志一改内容，印章就对不上正文；按既定规则退回草稿，等重新发布
      const log = await db.log.update({
        where: { id: input.id },
        data: { ...data, ...(existing.isPublished ? { isPublished: false } : {}) },
      });

      return { ok: true, id: log.id, slug: log.slug };
    }

    const log = await db.log.create({ data });

    return { ok: true, id: log.id, slug: log.slug };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "LOG_001" };
    }

    throw error;
  }
}

export async function publishLog(id: string): Promise<PublishLogResult> {
  const log = await db.log.findUnique({
    where: { id },
    select: { title: true, beforeContent: true, afterContent: true, slug: true },
  });

  if (!log) {
    return { ok: false, code: "LOG_002" };
  }

  const contentHash = computeContentHash(
    log.title,
    log.beforeContent,
    log.afterContent,
  );

  await db.log.update({
    where: { id },
    data: { contentHash, publishedAt: new Date(), isPublished: true },
  });

  return { ok: true, contentHash, slug: log.slug };
}

// 下架只翻 isPublished；历史 contentHash 与 publishedAt 保留，与 D9 退回草稿的口径一致
export async function unpublishLog(id: string): Promise<UnpublishLogResult> {
  const updated = await db.log.updateMany({
    where: { id },
    data: { isPublished: false },
  });

  if (updated.count === 0) {
    return { ok: false, code: "LOG_002" };
  }

  const log = await db.log.findUnique({ where: { id }, select: { slug: true } });

  return { ok: true, slug: log?.slug ?? "" };
}
