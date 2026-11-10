/**
 * 文件：src/lib/publish.ts
 * 描述：日志写入与发布存证：保存草稿、按 D5 口径计算 SHA-256、发布时写入哈希与服务器时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: 哈希口径改从 src/lib/content-hash.ts 引入，本文件不再自带一份
 * - 2026-11-03: 发布前加敏感信息扫描门（LOG_003，未确认不放行）；补 deleteLog 彻底删除
 * - 2026-11-09: V2.0 Step 4-B：四个写函数全部加 userId——创建带 userId，查改删一律 {id,userId}
 *               复合条件，updateMany/deleteMany 0 行命中报 LOG_002（跨租户与不存在同表现）
 * - 2026-11-10: V2.0 Step 5 Commit 2：LogInput 加 sourceCommitSha（同步草稿去重锚点）；
 *               只在显式提供时写入（条件展开），表单编辑不清掉已同步草稿的锚点
 */
import { Prisma } from "@prisma/client";
import { computeContentHash } from "@/lib/content-hash";
import { db } from "@/lib/db";
import { hasBlockingHit, scanSensitive } from "@/lib/sensitive-scan";

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
  sourceCommitSha?: string;
};

export type SaveLogResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; code: "LOG_001" | "LOG_002" };

export type PublishLogResult =
  | { ok: true; contentHash: string; slug: string }
  | { ok: false; code: "LOG_002" | "LOG_003" };

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

export async function saveLog(
  input: LogInput,
  userId: string,
): Promise<SaveLogResult> {
  // sourceCommitSha 只在显式提供时写入：表单编辑（未带该字段）不得把它清成 null，
  // 否则一条已同步草稿被编辑后就失去去重锚点，重跑会重复产草稿
  const sourceShaData =
    input.sourceCommitSha !== undefined ? { sourceCommitSha: input.sourceCommitSha } : {};
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
      const existing = await db.log.findFirst({
        where: { id: input.id, userId },
        select: { isPublished: true },
      });

      if (!existing) {
        return { ok: false, code: "LOG_002" };
      }

      // 已发布的日志一改内容，印章就对不上正文；按既定规则退回草稿，等重新发布。
      // 更新仍带 userId：存在性判定与写入之间行不会易主，0 行命中按同一口径报 LOG_002
      const updated = await db.log.updateMany({
        where: { id: input.id, userId },
        data: { ...data, ...sourceShaData, ...(existing.isPublished ? { isPublished: false } : {}) },
      });

      if (updated.count === 0) {
        return { ok: false, code: "LOG_002" };
      }

      return { ok: true, id: input.id, slug: input.slug };
    }

    const log = await db.log.create({ data: { ...data, ...sourceShaData, userId } });

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

export async function publishLog(
  id: string,
  userId: string,
  opts: { sensitiveConfirmed?: boolean } = {},
): Promise<PublishLogResult> {
  const log = await db.log.findFirst({
    where: { id, userId },
    select: {
      title: true,
      beforeContent: true,
      afterContent: true,
      lessonLearned: true,
      slug: true,
    },
  });

  if (!log) {
    return { ok: false, code: "LOG_002" };
  }

  // 扫的是库里将要公开的正文，不是表单声称的内容；未带确认标记就不放行（LOG_003）
  if (
    !opts.sensitiveConfirmed &&
    hasBlockingHit(
      scanSensitive(
        [log.title, log.beforeContent, log.afterContent, log.lessonLearned]
          .filter(Boolean)
          .join("\n"),
      ),
    )
  ) {
    return { ok: false, code: "LOG_003" };
  }

  const contentHash = computeContentHash(
    log.title,
    log.beforeContent,
    log.afterContent,
  );

  const published = await db.log.updateMany({
    where: { id, userId },
    data: { contentHash, publishedAt: new Date(), isPublished: true },
  });

  if (published.count === 0) {
    return { ok: false, code: "LOG_002" };
  }

  return { ok: true, contentHash, slug: log.slug };
}

// 下架只翻 isPublished；历史 contentHash 与 publishedAt 保留，与 D9 退回草稿的口径一致
export async function unpublishLog(
  id: string,
  userId: string,
): Promise<UnpublishLogResult> {
  const updated = await db.log.updateMany({
    where: { id, userId },
    data: { isPublished: false },
  });

  if (updated.count === 0) {
    return { ok: false, code: "LOG_002" };
  }

  const log = await db.log.findFirst({ where: { id, userId }, select: { slug: true } });

  return { ok: true, slug: log?.slug ?? "" };
}

export type DeleteLogResult =
  | { ok: true; slug: string }
  | { ok: false; code: "LOG_002" | "LOG_004" };

// 彻底删除与"下架"是两件事：下架保留历史摘要与发布时间，删除连行一起消失。
// 不可逆，所以要求把该条的 slug 原样输一遍作为确认，而不是靠一个弹窗按钮。
// 正文里引用过的图片对象不在此列——那把 RAM 密钥只有 PutObject，没有 DeleteObject，
// 刻意不扩权限，遗留对象交给存储桶的生命周期规则清理。
export async function deleteLog(
  id: string,
  userId: string,
  confirmSlug: string,
): Promise<DeleteLogResult> {
  const log = await db.log.findFirst({
    where: { id, userId },
    select: { slug: true },
  });

  if (!log) {
    return { ok: false, code: "LOG_002" };
  }

  if (confirmSlug !== log.slug) {
    return { ok: false, code: "LOG_004" };
  }

  const deleted = await db.log.deleteMany({ where: { id, userId } });

  if (deleted.count === 0) {
    return { ok: false, code: "LOG_002" };
  }

  return { ok: true, slug: log.slug };
}
