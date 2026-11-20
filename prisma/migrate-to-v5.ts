/**
 * 文件：prisma/migrate-to-v5.ts
 * 描述：V5 迁移脚本（Phase 0 体检 + Phase 1 存量版本回填）：
 *   --dry-run（默认，只读）：数量守恒基线、已发布轨迹与全部版本行的 D5 哈希复核、
 *     回填计划（现存版本行按 createdAt 升序自增分配 version + 当前发布快照追加一版）、
 *     (traceId, version) 冲突检测——有冲突直接报错终止，绝不写入
 *   --apply（必须显式传入）：按同一计划在事务内写库（版本回填 + 快照版本行 + 审计事件），
 *     提交后自证版本无空、无重复
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 0）。只读体检，不写库；哈希复核唯一实现复用
 *               ../src/lib/content-hash.ts（D5：禁止第二处重算）；草稿的 contentHash 是
 *               「上次发布」历史值（D9），与当前正文不一致属预期，不复核
 * - 2026-11-18: V5 Phase 1 集成存量版本回填：现存 TraceRevision 行按 createdAt 升序分配
 *               自增 version，当前发布快照追加一版（最新版本与快照一致时跳过，--apply 可幂等重跑）；
 *               冲突判据抽到 src/lib/version-conflict.ts 纯函数（dry-run 有冲突直接报错终止，不写入）；
 *               --apply 显式才写，写事务内含审计事件（actorId=system:v5-backfill）；
 *               模型改名 db.log→db.trace / db.revision→db.traceRevision（@@map 表名不变）
 * - 2026-11-18: V5 Phase 1 任务 7：--apply 事务内先幂等种子 8 个主题，再把每条已发布轨迹的 tags[]
 *               按 src/lib/topics.ts 映射写入 TraceTopic 连接行（已存在的连接跳过，tags[] 原文不改动）；
 *               dry-run 报告主题种子与连接计划，供预检核对
 *
 * 用法：node prisma/migrate-to-v5.ts [--dry-run | --apply]
 * 不带参数按 --dry-run 处理（只读）；生产环境部署 Phase 1 迁移前必须先跑回填。
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db.ts";
import { computeContentHash } from "../src/lib/content-hash.ts";
import { findVersionConflicts, type VersionSlot } from "../src/lib/version-conflict.ts";
import { TOPICS, topicsOfTags, type TopicKey } from "../src/lib/topics.ts";

const BACKFILL_ACTOR = "system:v5-backfill";

type ExistingRevision = {
  id: string;
  version: number | null;
  createdAt: Date;
  contentHash: string;
  publishedAt: Date;
};

type AppendSnapshot = {
  version: number;
  title: string;
  beforeContent: string;
  afterContent: string | null;
  tags: string[];
  contentHash: string;
  publishedAt: Date;
  verdictAtPublish: "PENDING" | "VERIFIED" | "OVERTURNED";
  scopeMd: string | null;
  riskMd: string | null;
  rollbackMd: string | null;
  impactMd: string | null;
};

type TracePlan = {
  traceId: string;
  slug: string;
  assign: { revisionId: string; version: number }[];
  append: AppendSnapshot | null;
  topicKeys: TopicKey[];
};

async function loadSnapshotRows() {
  return db.trace.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      beforeContent: true,
      afterContent: true,
      tags: true,
      contentHash: true,
      publishedAt: true,
      verdict: true,
      scopeMd: true,
      riskMd: true,
      rollbackMd: true,
      impactMd: true,
    },
  });
}

/** 生成回填计划并检测 (traceId, version) 冲突：任何重复都返回冲突清单（dry-run 据此报错） */
async function buildBackfillPlan(): Promise<{ plans: TracePlan[]; conflicts: string[] }> {
  const [snapshots, revisions] = await Promise.all([
    loadSnapshotRows(),
    db.traceRevision.findMany({
      select: { id: true, traceId: true, version: true, createdAt: true, contentHash: true, publishedAt: true },
    }),
  ]);

  const byTrace = new Map<string, ExistingRevision[]>();
  for (const r of revisions) {
    const list = byTrace.get(r.traceId) ?? [];
    list.push({
      id: r.id,
      version: r.version,
      createdAt: r.createdAt,
      contentHash: r.contentHash,
      publishedAt: r.publishedAt,
    });
    byTrace.set(r.traceId, list);
  }

  const plans: TracePlan[] = [];
  const conflicts: string[] = [];

  for (const t of snapshots) {
    const existing = (byTrace.get(t.id) ?? []).slice().sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
    );
    const used = new Set<number>();
    const assign: { revisionId: string; version: number }[] = [];

    // 已有非空 version 的行是固定锚点：先占位，分配与追加都必须避开（重复由下方全局扫描统一报）
    for (const r of existing) {
      if (r.version !== null) used.add(r.version);
    }

    let next = 1;
    for (const r of existing) {
      if (r.version !== null) {
        assign.push({ revisionId: r.id, version: r.version });
        continue;
      }
      while (used.has(next)) next++;
      used.add(next);
      assign.push({ revisionId: r.id, version: next });
      next++;
    }

    // 当前发布快照追加一版（首版也产版本行）；若最新已有版本与当前快照一致则跳过——保证 --apply 可幂等重跑
    let append: AppendSnapshot | null = null;
    if (t.contentHash && t.publishedAt) {
      const latest = existing.length > 0 ? existing[existing.length - 1] : null;
      const alreadySnapshotted =
        latest !== null &&
        latest.contentHash === t.contentHash &&
        latest.publishedAt.getTime() === t.publishedAt.getTime();
      if (!alreadySnapshotted) {
        let version = 1;
        while (used.has(version)) version++;
        append = {
          version,
          title: t.title,
          beforeContent: t.beforeContent,
          afterContent: t.afterContent,
          tags: t.tags,
          contentHash: t.contentHash,
          publishedAt: t.publishedAt,
          verdictAtPublish: t.verdict,
          scopeMd: t.scopeMd,
          riskMd: t.riskMd,
          rollbackMd: t.rollbackMd,
          impactMd: t.impactMd,
        };
      }
    } else {
      conflicts.push(`Trace ${t.slug}：已发布但缺 contentHash/publishedAt，跳过追加并记异常`);
    }

    plans.push({ traceId: t.id, slug: t.slug, assign, append, topicKeys: topicsOfTags(t.tags) });
  }

  // 终局判据：计划内 (traceId, version) 全局无重复——判据在纯函数 src/lib/version-conflict.ts，单测直接钉住
  const slots: VersionSlot[] = [];
  for (const plan of plans) {
    for (const a of plan.assign) slots.push({ traceId: plan.traceId, version: a.version });
    if (plan.append) slots.push({ traceId: plan.traceId, version: plan.append.version });
  }
  conflicts.push(...findVersionConflicts(slots));

  return { plans, conflicts };
}

async function dryRun() {
  const counts = {
    user: await db.user.count(),
    project: await db.project.count(),
    trace: await db.trace.count(),
    traceRevision: await db.traceRevision.count(),
    previewToken: await db.previewToken.count(),
    auditEvent: await db.auditEvent.count(),
    topic: await db.topic.count(),
    traceTopic: await db.traceTopic.count(),
    lead: await db.lead.count(),
    media: await db.media.count(),
    service: await db.service.count(),
    faq: await db.faq.count(),
  };

  const publishedTraces = await db.trace.findMany({
    where: { isPublished: true, contentHash: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      beforeContent: true,
      afterContent: true,
      contentHash: true,
      hashVersion: true,
    },
  });
  const logChecks = publishedTraces.map((t) => {
    const recomputed = computeContentHash(t.title, t.beforeContent, t.afterContent);
    return {
      id: t.id,
      slug: t.slug,
      hashVersion: t.hashVersion,
      stored: t.contentHash ?? "",
      recomputed,
      match: recomputed === t.contentHash,
    };
  });

  const revisions = await db.traceRevision.findMany({
    select: {
      id: true,
      title: true,
      beforeContent: true,
      afterContent: true,
      contentHash: true,
      hashVersion: true,
    },
  });
  const revisionChecks = revisions.map((r) => {
    const recomputed = computeContentHash(r.title, r.beforeContent, r.afterContent);
    return {
      id: r.id,
      stored: r.contentHash,
      recomputed,
      match: recomputed === r.contentHash,
    };
  });

  const { plans, conflicts } = await buildBackfillPlan();

  // 主题回填预检：8 个种子主题是否已在库、计划连接数、现存连接行
  const topicRows = await db.topic.findMany({ select: { id: true, slug: true } });
  const topicIdBySlug = new Map(topicRows.map((row) => [row.slug, row.id]));
  const missingTopics = TOPICS.filter((topic) => !topicIdBySlug.has(topic.key)).map(
    (topic) => topic.key,
  );
  const plannedLinks = plans.reduce((sum, plan) => sum + plan.topicKeys.length, 0);
  const existingLinks = await db.traceTopic.count();

  const baseline = {
    traceHashVersionNot1: await db.trace.count({ where: { hashVersion: { not: 1 } } }),
    traceDeleted: await db.trace.count({ where: { deletedAt: { not: null } } }),
    traceVerdictNotPending: await db.trace.count({ where: { verdict: { not: "PENDING" } } }),
    revisionHashVersionNot1: await db.traceRevision.count({ where: { hashVersion: { not: 1 } } }),
  };

  const logMismatch = logChecks.filter((c) => !c.match);
  const revMismatch = revisionChecks.filter((c) => !c.match);
  const pass =
    logMismatch.length === 0 &&
    revMismatch.length === 0 &&
    conflicts.length === 0 &&
    baseline.traceHashVersionNot1 === 0 &&
    baseline.traceDeleted === 0 &&
    baseline.traceVerdictNotPending === 0 &&
    baseline.revisionHashVersionNot1 === 0;

  const report = {
    ranAt: new Date().toISOString(),
    mode: "dry-run",
    scope: "本地库（生产 14 条轨迹需在真实环境重跑本脚本，本报告不代答）",
    counts,
    hashChecks: {
      publishedTraces: { total: logChecks.length, matched: logChecks.length - logMismatch.length, items: logChecks },
      revisions: { total: revisionChecks.length, matched: revisionChecks.length - revMismatch.length, items: revisionChecks },
      draftHashesSkipped: await db.trace.count({ where: { isPublished: false, contentHash: { not: null } } }),
    },
    backfill: {
      publishedTraces: plans.length,
      existingRevisionRows: plans.reduce((sum, p) => sum + p.assign.length, 0),
      appendedSnapshots: plans.filter((p) => p.append).length,
      conflicts,
    },
    topics: {
      seeded: topicRows.length,
      plannedLinks,
      existingLinks,
      missingTopics,
    },
    baseline,
    pass,
  };
  writeFileSync("tmp/v5-migration-dryrun.json", JSON.stringify(report, null, 2) + "\n");

  console.log(`数量基线：${JSON.stringify(counts)}`);
  console.log(`已发布轨迹哈希复核：${logChecks.length - logMismatch.length}/${logChecks.length} 一致`);
  console.log(`版本快照哈希复核：${revisionChecks.length - revMismatch.length}/${revisionChecks.length} 一致`);
  console.log(
    `回填计划：${plans.length} 条已发布轨迹 / 现存版本行 ${report.backfill.existingRevisionRows} / 追加快照 ${report.backfill.appendedSnapshots}`,
  );
  if (conflicts.length > 0) {
    console.log(`回填冲突（dry-run 拒绝，不写入）：\n  ${conflicts.join("\n  ")}`);
  }
  console.log(
    `主题回填预检：种子 ${topicRows.length} 个 / 计划连接 ${plannedLinks} / 现存连接 ${existingLinks}` +
      (missingTopics.length > 0 ? ` / 缺主题 ${missingTopics.join(",")}（--apply 会补建）` : ""),
  );
  console.log(`新增列基线：${JSON.stringify(baseline)}`);
  console.log("报告：tmp/v5-migration-dryrun.json");
  console.log(pass ? "DRY-RUN PASS" : "DRY-RUN FAIL");
  return pass;
}

async function applyBackfill() {
  const { plans, conflicts } = await buildBackfillPlan();
  if (conflicts.length > 0) {
    console.log(`回填冲突，拒绝写入：\n  ${conflicts.join("\n  ")}`);
    return false;
  }

  let createdLinks = 0;
  let existingLinkCount = 0;
  await db.$transaction(async (tx) => {
    // 主题种子（幂等）：连接行依赖主题行先存在，--apply 重跑不重复建
    for (const [index, topic] of TOPICS.entries()) {
      await tx.topic.upsert({
        where: { slug: topic.key },
        update: { name: topic.label, sortOrder: index + 1 },
        create: { slug: topic.key, name: topic.label, sortOrder: index + 1 },
      });
    }
    const linkTopicIdBySlug = new Map(
      (await tx.topic.findMany({ select: { slug: true, id: true } })).map((row) => [row.slug, row.id]),
    );
    const existingLinkKeys = new Set(
      (await tx.traceTopic.findMany({ select: { traceId: true, topicId: true } })).map(
        (row) => `${row.traceId}#${row.topicId}`,
      ),
    );
    existingLinkCount = existingLinkKeys.size;

    for (const plan of plans) {
      for (const a of plan.assign) {
        await tx.traceRevision.update({ where: { id: a.revisionId }, data: { version: a.version } });
      }
      if (plan.append) {
        const a = plan.append;
        await tx.traceRevision.create({
          data: {
            traceId: plan.traceId,
            version: a.version,
            title: a.title,
            beforeContent: a.beforeContent,
            afterContent: a.afterContent,
            tags: a.tags,
            contentHash: a.contentHash,
            publishedAt: a.publishedAt,
            verdictAtPublish: a.verdictAtPublish,
            hashVersion: 1,
            gitSha: null,
            gitTag: null,
            gitSyncedAt: null,
            scopeMd: a.scopeMd,
            riskMd: a.riskMd,
            rollbackMd: a.rollbackMd,
            impactMd: a.impactMd,
          },
        });
      }

      // 主题连接回填：tags[] 原文不动，只写 TraceTopic 连接行；已存在的连接跳过（幂等）
      for (const key of plan.topicKeys) {
        const topicId = linkTopicIdBySlug.get(key);
        if (!topicId) continue;
        const linkKey = `${plan.traceId}#${topicId}`;
        if (existingLinkKeys.has(linkKey)) continue;
        existingLinkKeys.add(linkKey);
        createdLinks += 1;
        await tx.traceTopic.create({ data: { traceId: plan.traceId, topicId } });
      }

      await tx.auditEvent.create({
        data: {
          actorId: BACKFILL_ACTOR,
          action: "v5_backfill_versions",
          targetType: "Trace",
          targetId: plan.traceId,
          meta: {
            slug: plan.slug,
            assigned: plan.assign.map((x) => x.version),
            appendedVersion: plan.append?.version ?? null,
            topics: plan.topicKeys,
          },
        },
      });
    }
  });

  const total = await db.traceRevision.count();
  const expected = plans.reduce((sum, p) => sum + p.assign.length, 0) + plans.filter((p) => p.append).length;
  const consistent = total === expected;
  const topicLinks = await db.traceTopic.count();
  const linksConsistent = topicLinks === existingLinkCount + createdLinks;
  console.log(`回填完成：版本行 ${total}（计划 ${expected}），计数对账${consistent ? "一致" : "不一致"}；主题连接 ${topicLinks}（现存 ${existingLinkCount} + 新增 ${createdLinks}），对账${linksConsistent ? "一致" : "不一致"}；重复版本会因唯一索引在写入时抛错，未抛即无冲突`);
  writeFileSync(
    "tmp/v5-migration-apply.json",
    JSON.stringify({
      ranAt: new Date().toISOString(),
      mode: "apply",
      traces: plans.length,
      totalRevisions: total,
      expected,
      consistent,
      topicLinks: {
        total: topicLinks,
        existing: existingLinkCount,
        created: createdLinks,
        consistent: linksConsistent,
      },
    }, null, 2) + "\n",
  );
  return consistent && linksConsistent;
}

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
const pass = mode === "apply" ? await applyBackfill() : await dryRun();
await db.$disconnect();
process.exit(pass ? 0 : 1);