/**
 * 文件：tests/export.test.ts
 * 描述：全站数据导出纯函数回归测试：counts 统计、确定性排序、ISO 化、全字段无损
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F25 全站数据导出 Commit 3）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExportPayload } from "../src/lib/export.ts";

const FIXED_DATE = new Date("2026-11-12T08:00:00Z");

// 夹具用 运行时拼接的假 id/sha，不放连续凭据形态
const PROJECTS = [
  {
    id: "clx1",
    slug: "laity-archive",
    name: "Laity 项目档案库",
    kind: "site",
    status: "LIVE",
    summary: "个人全栈数字档案库",
    repoUrl: "https://github.com/laity9527/laity-archive",
    userId: "clx0",
    createdAt: new Date("2026-10-30T00:00:00Z"),
  },
  {
    id: "clx2",
    slug: "earth-mirror",
    name: "Earth Mirror",
    kind: "product",
    status: "WIP",
    summary: null,
    repoUrl: null,
    userId: "clx0",
    createdAt: new Date("2026-11-01T00:00:00Z"),
  },
];

const LOGS = [
  {
    id: "clx10",
    title: "日志一",
    slug: "log-one",
    projectId: "clx1",
    userId: "clx0",
    tags: ["tag-a"],
    beforeContent: "BEFORE 一",
    afterContent: "AFTER 一",
    beforeDate: new Date("2026-11-01T00:00:00Z"),
    afterDate: new Date("2026-11-02T00:00:00Z"),
    isPublished: true,
    lessonLearned: "经验一",
    publishedAt: new Date("2026-11-03T00:00:00Z"),
    contentHash: "a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5",
    sourceCommitSha: "abc123def456",
    isAiAssisted: false,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-03T00:00:00Z"),
  },
  {
    id: "clx11",
    title: "日志二（草稿）",
    slug: "log-two",
    projectId: "clx1",
    userId: "clx0",
    tags: [],
    beforeContent: "BEFORE 二",
    afterContent: null,
    beforeDate: new Date("2026-11-05T00:00:00Z"),
    afterDate: null,
    isPublished: false,
    lessonLearned: null,
    publishedAt: null,
    contentHash: null,
    sourceCommitSha: null,
    isAiAssisted: true,
    createdAt: new Date("2026-11-05T00:00:00Z"),
    updatedAt: new Date("2026-11-05T00:00:00Z"),
  },
  {
    id: "clx12",
    title: "日志三（同步草稿）",
    slug: "log-three",
    projectId: "clx2",
    userId: "clx0",
    tags: ["tag-b"],
    beforeContent: "BEFORE 三",
    afterContent: "AFTER 三",
    beforeDate: new Date("2026-11-08T00:00:00Z"),
    afterDate: new Date("2026-11-09T00:00:00Z"),
    isPublished: true,
    lessonLearned: null,
    publishedAt: new Date("2026-11-10T00:00:00Z"),
    contentHash: "b123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    sourceCommitSha: "sha-xyz-789",
    isAiAssisted: false,
    createdAt: new Date("2026-11-08T00:00:00Z"),
    updatedAt: new Date("2026-11-10T00:00:00Z"),
  },
];

test("meta.counts 统计准确：总数、已发布、草稿", () => {
  const payload = buildExportPayload({
    projects: PROJECTS,
    logs: LOGS,
    handle: "zhanglei",
    exportedAt: FIXED_DATE,
  });

  assert.equal(payload.meta.counts.projects, 2);
  assert.equal(payload.meta.counts.logs, 3);
  assert.equal(payload.meta.counts.published, 2);
  assert.equal(payload.meta.counts.drafts, 1);
});

test("projects 按 slug 升序排列（与输入顺序无关）", () => {
  const payload = buildExportPayload({
    projects: [PROJECTS[1], PROJECTS[0]],
    logs: LOGS,
    handle: "zhanglei",
    exportedAt: FIXED_DATE,
  });

  const slugs = payload.projects.map((project) => project.slug);

  assert.deepEqual(slugs, ["earth-mirror", "laity-archive"]);
});

test("logs 按 beforeDate 降序排列（与输入顺序无关）", () => {
  const payload = buildExportPayload({
    projects: PROJECTS,
    logs: [LOGS[2], LOGS[0], LOGS[1]],
    handle: "zhanglei",
    exportedAt: FIXED_DATE,
  });

  const ids = payload.logs.map((log) => log.id);

  assert.deepEqual(ids, ["clx12", "clx11", "clx10"]);
});

test("exportedAt 是可被 Date 解析的 ISO 字符串", () => {
  const payload = buildExportPayload({
    projects: PROJECTS,
    logs: LOGS,
    handle: "zhanglei",
    exportedAt: FIXED_DATE,
  });

  assert.equal(typeof payload.meta.exportedAt, "string");

  const parsed = new Date(payload.meta.exportedAt);

  assert.ok(!Number.isNaN(parsed.getTime()), "exportedAt 必须可解析");
  assert.equal(parsed.toISOString(), payload.meta.exportedAt);
});

test("全字段无损：contentHash / isAiAssisted / sourceCommitSha 等核心字段都在", () => {
  const payload = buildExportPayload({
    projects: PROJECTS,
    logs: LOGS,
    handle: "zhanglei",
    exportedAt: FIXED_DATE,
  });

  const findLog = (id: string) => payload.logs.find((log) => log.id === id);

  const logOne = findLog("clx10");
  assert.ok(logOne, "clx10 应存在于导出结果中");
  assert.equal(logOne.contentHash, LOGS[0].contentHash);
  assert.equal(logOne.isAiAssisted, LOGS[0].isAiAssisted);
  assert.equal(logOne.sourceCommitSha, LOGS[0].sourceCommitSha);

  for (const log of payload.logs) {
    assert.deepEqual(log, LOGS.find((item) => item.id === log.id));
  }

  for (const project of payload.projects) {
    assert.deepEqual(project, PROJECTS.find((item) => item.id === project.id));
  }
});
