/**
 * 文件：tests/stats-core.test.ts
 * 描述：统计底座回归：聚合形状口径、内存访问计数器并发安全、
 *       stats 层无写库语句断言（只读红线）、首页接线断言（复用 DAL 防重复开发）
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 3 任务 5）。并发安全用交错异步任务各做同步自增验证总量不丢
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  VisitCounter,
  computeStats,
  overturnRate,
  sevenDaysAgo,
} from "../src/lib/stats-core.ts";

const BASE = {
  leadTotal: 12,
  leadNew: 3,
  leadLast7Days: 5,
  leadByStatus: { NEW: 3, REPLIED: 6, ARCHIVED: 2, SPAM: 1 },
  mediaTotal: 8,
  mediaDeleted: 2,
  evidenceMedia: 3,
  serviceVisits: { services: 7 },
  faqVisits: { faq: 4 },
  publishedLast7Days: 2,
  pendingAnchorVersions: 9,
  overturnRate: 0.25,
};

test("聚合形状：口径逐字段对拍，不二次加工", () => {
  const stats = computeStats(BASE);
  assert.equal(stats.leads.total, 12);
  assert.equal(stats.leads.new, 3);
  assert.equal(stats.leads.last7Days, 5);
  assert.deepEqual(stats.leads.byStatus, BASE.leadByStatus);
  assert.equal(stats.media.total, 8);
  assert.equal(stats.media.deleted, 2);
  assert.equal(stats.media.evidence, 3);
  assert.deepEqual(stats.visits.services, { services: 7 });
  assert.deepEqual(stats.visits.faq, { faq: 4 });
});

test("聚合形状：空计数快照给 0 而非缺字段", () => {
  const stats = computeStats({ ...BASE, serviceVisits: {}, faqVisits: {}, leadByStatus: {} });
  assert.deepEqual(stats.visits.services, {});
  assert.deepEqual(stats.visits.faq, {});
  assert.deepEqual(stats.leads.byStatus, {});
});

test("访问计数器：单调自增、key 互不影响、快照是拷贝", () => {
  const counter = new VisitCounter();
  counter.increment("services");
  counter.increment("services");
  counter.increment("faq");
  assert.deepEqual(counter.snapshot(), { services: 2, faq: 1 });

  const snap = counter.snapshot();
  snap.services = 999;
  assert.equal(counter.snapshot().services, 2);
});

test("并发下访问计数安全：交错异步任务各自同步自增，总量不丢", async () => {
  const counter = new VisitCounter();
  const TASKS = 50;
  const EACH = 40;

  await Promise.all(
    Array.from({ length: TASKS }, async (_, taskId) => {
      for (let i = 0; i < EACH; i++) {
        // 自增是同步单步（读改写之间无 await），事件循环切换点落在任务之间也不丢计数
        counter.increment(`key-${taskId % 4}`);
        if (i % 7 === 0) {
          await Promise.resolve();
        }
      }
    }),
  );

  const snap = counter.snapshot();
  const total = Object.values(snap).reduce((sum, n) => sum + n, 0);
  assert.equal(total, TASKS * EACH);
  assert.equal(Object.keys(snap).length, 4);
});

test("只读红线：stats 两文件不得出现任何写库语句", () => {
  for (const file of ["src/lib/stats-admin.ts", "src/lib/stats-core.ts"]) {
    const source = readFileSync(file, "utf8");
    for (const verb of [".create(", ".update(", ".delete(", ".upsert(", "updateMany", "deleteMany", "createMany"]) {
      assert.ok(!source.includes(verb), `${file} 出现写库语句 ${verb}`);
    }
  }
});

test("首页接线断言：数据走既有 DAL、表单复用 LeadForm，页内零提交逻辑", () => {
  const source = readFileSync("src/app/page.tsx", "utf8");
  for (const marker of ["listEnabledServices", "listEnabledFaqs", "LeadForm", "SectionHead", 'id="main"']) {
    assert.ok(source.includes(marker), `首页缺少 ${marker}`);
  }
  // 防重复开发：首页不得自带提交校验、限流、直连 Prisma 等底层逻辑
  for (const banned of ["fetch(", "validateLeadInput", "checkLeadRateLimit", "new PrismaClient", "computeIpHash"]) {
    assert.ok(!source.includes(banned), `首页出现越界逻辑 ${banned}`);
  }
});

test("反转率口径：正常比值、分母 0 → null", () => {
  assert.equal(overturnRate(3, 1), 0.25);
  assert.equal(overturnRate(0, 5), 1);
  assert.equal(overturnRate(5, 0), 0);
  assert.equal(overturnRate(0, 0), null);
});

test("近 7 天窗口：起点恰为 now - 7×24h", () => {
  const now = new Date("2026-11-19T12:00:00.000Z");
  assert.equal(sevenDaysAgo(now).toISOString(), "2026-11-12T12:00:00.000Z");
});

test("聚合形状：派生指标三字段进快照", () => {
  const stats = computeStats({
    ...BASE,
    publishedLast7Days: 4,
    pendingAnchorVersions: 6,
    overturnRate: null,
  });
  assert.deepEqual(stats.derived, {
    publishedLast7Days: 4,
    pendingAnchorVersions: 6,
    overturnRate: null,
  });
});

test("看板页接线断言：消费 loadStats、SVG 条形自绘、零图表库零写库", () => {
  const source = readFileSync("src/app/admin/stats/page.tsx", "utf8");
  for (const marker of ["loadStats", "<svg", "requireAdminSession"]) {
    assert.ok(source.includes(marker), `看板页缺少 ${marker}`);
  }
  for (const banned of ["chart", "Chart", ".create(", ".update(", ".delete(", "recharts"]) {
    assert.ok(!source.includes(banned), `看板页出现越界引用 ${banned}`);
  }
});

test("索引大厅接线断言：复用四数据函数与既有组件，无重复实现", () => {
  const source = readFileSync("src/app/archive/page.tsx", "utf8");
  for (const marker of ["getArchiveBoard", "pickFeatured", "getLatestLogs", "getTopicCounts", "getArchive", "StatusBoard", "Timeline", 'id="main"']) {
    assert.ok(source.includes(marker), `索引大厅缺少 ${marker}`);
  }
  // 防重复开发：不得自带提交、限流、直连 Prisma 等底层逻辑
  for (const banned of ["fetch(", "new PrismaClient", "validateLeadInput"]) {
    assert.ok(!source.includes(banned), `索引大厅出现越界逻辑 ${banned}`);
  }
});
