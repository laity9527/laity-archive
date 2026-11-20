/**
 * 文件：tests/service-faq-filter.test.ts
 * 描述：Service / Faq 前台口径回归：enabled 过滤、sort 升序、同值稳定序、字段校验、审计条目形态
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 7）。排序过滤口径与 DAL 的 SQL 口径一致
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FAQ_LIMITS,
  faqAuditEntry,
  orderEnabledFaqs,
  validateFaqInput,
} from "../src/lib/faq-validate.ts";
import {
  SERVICE_LIMITS,
  serviceAuditEntry,
  orderEnabledServices,
  validateServiceInput,
} from "../src/lib/service-validate.ts";

const base = (id: string, sort: number, enabled = true, at = 0) => ({
  id,
  enabled,
  sort,
  createdAt: new Date(at),
});

test("服务排序：只留启用、按 sort 升序", () => {
  const items = [
    base("s3", 30),
    base("s1", 10),
    base("s2", 20, false),
    base("s0", 5),
  ];
  const ordered = orderEnabledServices(items);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["s0", "s1", "s3"],
  );
});

test("服务排序：同 sort 按创建时间稳定排序", () => {
  const items = [base("late", 10, true, 200), base("early", 10, true, 100)];
  const ordered = orderEnabledServices(items);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["early", "late"],
  );
});

test("问答排序：只留启用、按 sort 升序", () => {
  const items = [
    base("q2", 20),
    base("q1", 10, false),
    base("q0", 5),
  ];
  const ordered = orderEnabledFaqs(items);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["q0", "q2"],
  );
});

test("服务字段校验：标题必填、简介与正文有上限", () => {
  assert.deepEqual(
    validateServiceInput({ title: "正常服务", summary: "简介", body: "正文" }),
    { ok: true },
  );
  assert.deepEqual(
    validateServiceInput({ title: "", summary: "简介", body: "正文" }),
    { ok: false, field: "title" },
  );
  assert.deepEqual(
    validateServiceInput({ title: "a".repeat(SERVICE_LIMITS.title + 1), summary: "", body: "" }),
    { ok: false, field: "title" },
  );
  assert.deepEqual(
    validateServiceInput({ title: "t", summary: "s".repeat(SERVICE_LIMITS.summary + 1), body: "" }),
    { ok: false, field: "summary" },
  );
  assert.deepEqual(
    validateServiceInput({ title: "t", summary: "", body: "b".repeat(SERVICE_LIMITS.body + 1) }),
    { ok: false, field: "body" },
  );
});

test("问答字段校验：问题必填、回答有上限", () => {
  assert.deepEqual(validateFaqInput({ question: "问题", answer: "回答" }), { ok: true });
  assert.deepEqual(validateFaqInput({ question: "", answer: "回答" }), { ok: false, field: "question" });
  assert.deepEqual(
    validateFaqInput({ question: "q", answer: "a".repeat(FAQ_LIMITS.answer + 1) }),
    { ok: false, field: "answer" },
  );
});

test("审计条目：服务与问答的动作与目标形态", () => {
  const service = serviceAuditEntry("admin_1", "service.create", { id: "sv_1" }, { title: "档案构建咨询" });
  assert.deepEqual(service, {
    actorId: "admin_1",
    action: "service.create",
    targetType: "Service",
    targetId: "sv_1",
    meta: { title: "档案构建咨询" },
  });

  const faq = faqAuditEntry("admin_1", "faq.enabled", { id: "fq_1" }, { enabled: true });
  assert.equal(faq.action, "faq.enabled");
  assert.equal(faq.targetType, "Faq");
  assert.equal(faq.targetId, "fq_1");
});
