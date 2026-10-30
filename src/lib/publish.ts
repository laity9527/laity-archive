/**
 * 文件：src/lib/publish.ts
 * 描述：日志写入与发布存证：保存草稿、按 D5 口径计算 SHA-256、发布时写入哈希与服务器时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
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

// D5 口径：title + "\n" + beforeContent + "\n" + (afterContent ?? "")
export function computeContentHash(
  title: string,
  beforeContent: string,
  afterContent?: string | null,
) {
  return createHash("sha256")
    .update(`${title}\n${beforeContent}\n${afterContent ?? ""}`, "utf8")
    .digest("hex");
}

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
