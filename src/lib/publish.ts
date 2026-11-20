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
 * - 2026-11-10: V2.0 Step 6 Commit 3：LogInput 加 isAiAssisted（AI 辅助生成标记）；
 *               仅当显式为 true 时落库，缺省（未点过 AI 按钮的表单）保持默认 false
 * - 2026-11-13: 写入时标签收口统一到 normalizeTagList（表单 + GitHub 同步两条路径）；
 *               去 @ 前缀、忽略大小写去重，条数上限仍由动作层校验
 * - 2026-11-18: V5 Phase 1 两阶段发布：编辑草稿不产版本行；发布在事务内插入 TraceRevision
 *               （version 自增、五要素/裁决快照/hashVersion=2 随版本冻结）并更新 Trace；
 *               事务提交后才异步 Git 锚定（失败不阻断，gitSha 留 null 可后台重试）；
 *               新增 LOG_005 裁决门（OVERTURNED 必填 verdictNote）；删除 20 条版本裁剪
 * - 2026-11-18: 发布闸门与版本自增抽为纯函数 evaluatePublishGate / nextRevisionVersion（测试单源，
 *               publishLog 只负责取数与事务，闸门判定可被单测钉住）
 * - 2026-11-19: V5 Phase 2 任务 2.4：发布事务内把该轨迹 isEvidence 媒体的哈希清单
 *               （JSON 数组文本）冻结进版本行 mediaHashes 字段——正文哈希口径独立不变，
 *               媒体哈希仅作附属证据清单，不进 Git 正文存证
 */
import { Prisma } from "@prisma/client";
import { computeContentHashV2 } from "@/lib/canonical-hash";
import { db } from "@/lib/db";
import { normalizeTagList } from "@/lib/forms";
import { ensureSeries } from "@/lib/series-store";
import { runGitAnchorQuietly } from "@/lib/git-evidence";
import { evaluatePublishGate, nextRevisionVersion } from "@/lib/publish-gate";
import type { Verdict } from "@prisma/client";

export type LogInput = {
  id?: string;
  projectId: string;
  slug: string;
  title: string;
  tags: string[];
  // 系列名（V3.1 G2）：可空，自由文本；写库前 trim，空串存 null
  series?: string;
  beforeContent: string;
  afterContent?: string;
  beforeDate: Date;
  afterDate?: Date;
  lessonLearned?: string;
  sourceCommitSha?: string;
  // AI 辅助生成标记（V2.0 Step 6）：只有表单里带 isAiAssisted=true 的提交才会置真；
  // 编辑器未点过 [ AI 帮我写 ] 时表单不带该字段，落库走模型默认 false
  isAiAssisted?: boolean;
  // V5 Phase 1：五要素与裁决（表单采集，随发布冻结进版本行）
  verdict?: Verdict;
  verdictNote?: string;
  scopeMd?: string;
  riskMd?: string;
  rollbackMd?: string;
  impactMd?: string;
};

export type SaveLogResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; code: "LOG_001" | "LOG_002" };

export type PublishLogResult =
  | {
      ok: true;
      contentHash: string;
      slug: string;
      publishedAt: string;
      scanHits: number;
      version: number;
      hashVersion: 2;
      gitPending: boolean;
    }
  | { ok: false; code: "LOG_002" | "LOG_003" | "LOG_005" };

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
  const seriesName = input.series?.trim() || null;
  // 兼容迁移：字符串继续写（旧 URL/展示），同时落 Series 实体 id；无系列则两列都为空
  const seriesId = seriesName ? await ensureSeries(userId, seriesName) : null;
  const data = {
    projectId: input.projectId,
    slug: input.slug,
    title: input.title,
    tags: normalizeTagList(input.tags),
    series: seriesName,
    seriesId,
    beforeContent: input.beforeContent,
    afterContent: input.afterContent || null,
    beforeDate: input.beforeDate,
    afterDate: input.afterDate ?? null,
    lessonLearned: input.lessonLearned || null,
    isAiAssisted: input.isAiAssisted === true,
    // V5 Phase 1：五要素与裁决随内容一起保存（表单采集；裁决门在发布时校验）
    verdict: input.verdict ?? "PENDING",
    verdictNote: input.verdictNote || null,
    scopeMd: input.scopeMd || null,
    riskMd: input.riskMd || null,
    rollbackMd: input.rollbackMd || null,
    impactMd: input.impactMd || null,
  };

  try {
    if (input.id) {
      const existing = await db.trace.findFirst({
        where: { id: input.id, userId },
        select: { isPublished: true },
      });

      if (!existing) {
        return { ok: false, code: "LOG_002" };
      }

      // 已发布的日志一改内容，印章就对不上正文；按既定规则退回草稿，等重新发布。
      // 更新仍带 userId：存在性判定与写入之间行不会易主，0 行命中按同一口径报 LOG_002
      const updated = await db.trace.updateMany({
        where: { id: input.id, userId },
        data: { ...data, ...sourceShaData, ...(existing.isPublished ? { isPublished: false } : {}) },
      });

      if (updated.count === 0) {
        return { ok: false, code: "LOG_002" };
      }

      return { ok: true, id: input.id, slug: input.slug };
    }

    const log = await db.trace.create({ data: { ...data, ...sourceShaData, userId } });

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
  const log = await db.trace.findFirst({
    where: { id, userId },
    select: {
      title: true,
      tags: true,
      series: true,
      beforeContent: true,
      afterContent: true,
      lessonLearned: true,
      slug: true,
      lastPublishedSnapshot: true,
      // V5 Phase 1：五要素、裁决与当前版本指针（发布事务要用）
      verdict: true,
      verdictNote: true,
      scopeMd: true,
      riskMd: true,
      rollbackMd: true,
      impactMd: true,
      currentRevId: true,
    },
  });

  if (!log) {
    return { ok: false, code: "LOG_002" };
  }

  // 闸门判定走纯函数 evaluatePublishGate（测试钉住）：扫的是库里将要公开的正文，不是表单声称的内容
  const gate = evaluatePublishGate({
    title: log.title,
    beforeContent: log.beforeContent,
    afterContent: log.afterContent,
    lessonLearned: log.lessonLearned,
    sensitiveConfirmed: opts.sensitiveConfirmed,
    verdict: log.verdict,
    verdictNote: log.verdictNote,
  });

  if (!gate.ok) {
    return { ok: false, code: gate.code };
  }

  const scanHits = gate.scanHits;

  // V5 Phase 1：新发布启用 v2 规范化口径（历史版本行的 v1 哈希永不重算）
  const contentHash = computeContentHashV2(
    log.title,
    log.beforeContent,
    log.afterContent,
  );

  const publishedAt = new Date();
  // G8：发布时把“对外长什么样”整份存下来；之后编辑退回草稿，编辑页/快照页拿它对比
  const lastPublishedSnapshot = {
    title: log.title,
    beforeContent: log.beforeContent,
    afterContent: log.afterContent,
    lessonLearned: log.lessonLearned,
    tags: log.tags,
    series: log.series,
    contentHash,
    publishedAt: publishedAt.toISOString(),
  };

  const published = await db.$transaction(async (tx) => {
    // V5 Phase 1：每次发布（含首版）产一条不可变版本行；version 从现存最大值 +1 自增
    const maxRow = await tx.traceRevision.findFirst({
      where: { traceId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = nextRevisionVersion(maxRow?.version ?? null);

    // V5 Phase 2（任务 2.4）：附属媒体证据哈希清单——该轨迹 isEvidence 且未软删的媒体哈希
    // 按升序冻结进版本行；正文哈希口径独立不变，媒体哈希只是附属证据清单，不进 Git 正文存证
    const evidenceMedia = await tx.media.findMany({
      where: { traceId: id, isEvidence: true, deletedAt: null, hash: { not: null } },
      select: { hash: true },
      orderBy: { hash: "asc" },
    });
    const mediaHashes =
      evidenceMedia.length > 0 ? JSON.stringify(evidenceMedia.map((row) => row.hash)) : null;

    // 版本行冻结本次发布的全部内容：正文、五要素、裁决快照、哈希口径
    const revision = await tx.traceRevision.create({
      data: {
        traceId: id,
        version,
        title: log.title,
        beforeContent: log.beforeContent,
        afterContent: log.afterContent,
        tags: log.tags,
        contentHash,
        hashVersion: 2,
        publishedAt,
        verdictAtPublish: log.verdict,
        gitSha: null,
        gitTag: null,
        gitSyncedAt: null,
        scopeMd: log.scopeMd,
        riskMd: log.riskMd,
        rollbackMd: log.rollbackMd,
        impactMd: log.impactMd,
        mediaHashes,
      },
      select: { id: true },
    });

    const updated = await tx.trace.updateMany({
      where: { id, userId },
      data: {
        contentHash,
        hashVersion: 2,
        publishedAt,
        isPublished: true,
        lastPublishedSnapshot,
        currentRevId: revision.id,
        ...(log.verdict !== "PENDING" ? { verifiedAt: publishedAt } : {}),
      },
    });

    return { updatedCount: updated.count, version };
  });

  if (published.updatedCount === 0) {
    return { ok: false, code: "LOG_002" };
  }

  // Git 时间锚定在事务提交之后异步执行：失败不阻断发布，gitSha 留 null（待锚定），后台可重试
  void runGitAnchorQuietly({
    userId,
    trace: {
      slug: log.slug,
      title: log.title,
      beforeContent: log.beforeContent,
      afterContent: log.afterContent,
      contentHash,
      publishedAt,
    },
    version: published.version,
  });

  return {
    ok: true,
    contentHash,
    slug: log.slug,
    publishedAt: publishedAt.toISOString(),
    scanHits,
    version: published.version,
    hashVersion: 2,
    gitPending: true,
  };
}

// 下架只翻 isPublished；历史 contentHash 与 publishedAt 保留，与 D9 退回草稿的口径一致
export async function unpublishLog(
  id: string,
  userId: string,
): Promise<UnpublishLogResult> {
  const updated = await db.trace.updateMany({
    where: { id, userId },
    data: { isPublished: false },
  });

  if (updated.count === 0) {
    return { ok: false, code: "LOG_002" };
  }

  const log = await db.trace.findFirst({ where: { id, userId }, select: { slug: true } });

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
  const log = await db.trace.findFirst({
    where: { id, userId },
    select: { slug: true },
  });

  if (!log) {
    return { ok: false, code: "LOG_002" };
  }

  if (confirmSlug !== log.slug) {
    return { ok: false, code: "LOG_004" };
  }

  // V5 Phase 1：Restrict 外键下，已发布条目的彻底删除必须先清掉它的版本行再删轨迹——
  // 「版本行永不删除」管的是正常流程（不裁剪、不自动删），不挡显式彻底删除这一不可逆操作；
  // 否则 Restrict 会让已发布条目永远删不掉，deleteLog 直接 P2003 变 500
  await db.$transaction(async (tx) => {
    await tx.traceRevision.deleteMany({ where: { traceId: id } });
    await tx.trace.deleteMany({ where: { id, userId } });
  });

  const deleted = await db.trace.findUnique({ where: { id } });

  if (deleted) {
    return { ok: false, code: "LOG_002" };
  }

  return { ok: true, slug: log.slug };
}
