/**
 * 文件：src/lib/preview.ts
 * 描述：公开预览链接的数据访问：生成（存哈希）、解析（校验过期）、计数与撤销
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（V3.1 G7）。明文 token 只在生成的响应里出现一次，库里只有 SHA-256；
 *               解析时哈希后查唯一键，过期即当不存在；日志删除由外键级联清 token
 */
import { db } from "@/lib/db";
import {
  createPreviewTokenValue,
  hashPreviewToken,
  isPreviewTokenExpired,
  previewTokenExpiry,
} from "@/lib/preview-token";

export type CreatedPreviewToken = { token: string; expiresAt: Date };

export async function createPreviewToken(
  logId: string,
  userId: string,
): Promise<CreatedPreviewToken | null> {
  const log = await db.trace.findFirst({
    where: { id: logId, userId },
    select: { id: true },
  });

  if (!log) {
    return null;
  }

  const token = createPreviewTokenValue();
  const expiresAt = previewTokenExpiry();

  await db.previewToken.create({
    data: {
      tokenHash: hashPreviewToken(token),
      logId,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export type ResolvedPreview = {
  expiresAt: Date;
  log: {
    id: string;
    userId: string | null;
    projectId: string;
    title: string;
    slug: string;
    series: string | null;
    tags: string[];
    beforeContent: string;
    afterContent: string | null;
    lessonLearned: string | null;
    project: { name: string };
    user: { handle: string } | null;
  };
};

export async function resolvePreviewToken(
  token: string,
): Promise<ResolvedPreview | null> {
  if (!token) {
    return null;
  }

  const row = await db.previewToken.findUnique({
    where: { tokenHash: hashPreviewToken(token) },
    select: {
      expiresAt: true,
      log: {
        select: {
          id: true,
          userId: true,
          projectId: true,
          title: true,
          slug: true,
          series: true,
          tags: true,
          beforeContent: true,
          afterContent: true,
          lessonLearned: true,
          project: { select: { name: true } },
          user: { select: { handle: true } },
        },
      },
    },
  });

  if (!row || isPreviewTokenExpired(row.expiresAt)) {
    return null;
  }

  return { expiresAt: row.expiresAt, log: row.log };
}

// Proxy 前置判定用：只查“是否存在且未过期”，不取正文
export async function isActivePreviewToken(token: string) {
  if (!token) {
    return false;
  }

  const hit = await db.previewToken.findFirst({
    where: {
      tokenHash: hashPreviewToken(token),
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return hit !== null;
}

export async function countActivePreviewTokens(
  logId: string,
  userId: string,
) {
  return db.previewToken.count({
    where: { logId, userId, expiresAt: { gt: new Date() } },
  });
}

export async function revokePreviewTokens(logId: string, userId: string) {
  return db.previewToken.deleteMany({ where: { logId, userId } });
}
