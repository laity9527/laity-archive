/**
 * 文件：tests/publish-gate.test.ts
 * 描述：发布闸门与版本自增回归：敏感扫描门（LOG_003）、裁决依据门（LOG_005）、版本号自增
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 8：发布闸门纯函数单测，判定逻辑不依赖数据库）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluatePublishGate,
  nextRevisionVersion,
} from "../src/lib/publish-gate.ts";

const CLEAN = {
  title: "构建期预生成索引",
  beforeContent: "构建耗时从 3.2s 涨到 11.8s。",
  afterContent: "首次打开 1.1s。",
  lessonLearned: null,
  verdict: "PENDING" as const,
  verdictNote: null,
};

test("干净正文：放行且阻断级命中为 0", () => {
  const result = evaluatePublishGate(CLEAN);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.scanHits, 0);
});

test("阻断级命中未确认：LOG_003 不放行", () => {
  const result = evaluatePublishGate({
    ...CLEAN,
    beforeContent: "误贴了令牌 ghp_FakeTokenForTestOnly1234567890 进正文",
  });

  assert.deepEqual(result, { ok: false, code: "LOG_003" });
});

test("阻断级命中已确认：放行并如实回出命中数", () => {
  const result = evaluatePublishGate({
    ...CLEAN,
    beforeContent: "误贴了令牌 ghp_FakeTokenForTestOnly1234567890 进正文",
    sensitiveConfirmed: true,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.scanHits, 1);
});

test("仅提示级命中（邮箱）：不拦发布，scanHits 不计", () => {
  const result = evaluatePublishGate({
    ...CLEAN,
    lessonLearned: "联系我：zhanglei@example.com",
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.scanHits, 0);
});

test("裁决为被推翻但无依据：LOG_005 不放行", () => {
  const result = evaluatePublishGate({ ...CLEAN, verdict: "OVERTURNED", verdictNote: null });
  assert.deepEqual(result, { ok: false, code: "LOG_005" });
});

test("裁决为被推翻但依据只有空白：同判 LOG_005", () => {
  const result = evaluatePublishGate({ ...CLEAN, verdict: "OVERTURNED", verdictNote: "   " });
  assert.deepEqual(result, { ok: false, code: "LOG_005" });
});

test("裁决为被推翻且有依据：放行", () => {
  const result = evaluatePublishGate({
    ...CLEAN,
    verdict: "OVERTURNED",
    verdictNote: "基准实测不达标，结论作废。",
  });

  assert.equal(result.ok, true);
});

test("两道门同时触发：先扫敏感（LOG_003 优先于 LOG_005）", () => {
  const result = evaluatePublishGate({
    ...CLEAN,
    beforeContent: "令牌 ghp_FakeTokenForTestOnly1234567890 泄漏进正文",
    verdict: "OVERTURNED",
    verdictNote: null,
  });

  assert.deepEqual(result, { ok: false, code: "LOG_003" });
});

test("版本自增：无版本行首版为 1，从最大值 +1", () => {
  assert.equal(nextRevisionVersion(null), 1);
  assert.equal(nextRevisionVersion(0), 1);
  assert.equal(nextRevisionVersion(7), 8);
});
