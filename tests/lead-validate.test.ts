/**
 * 文件：tests/lead-validate.test.ts
 * 描述：线索提交校验与状态流转回归：字段规则、流转判据、审计条目形态
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 7）。校验与流转判据为纯函数，不依赖数据库
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEAD_LIMITS,
  LEAD_MIN_FILL_MS,
  leadAntiSpam,
  leadAuditEntry,
  leadTransitionAllowed,
  validateLeadInput,
} from "../src/lib/lead-validate.ts";

const VALID = {
  name: "张三",
  email: "zhangsan@example.com",
  reqType: "项目合作",
  evidenceReq: "",
  message: "想聊聊档案库的合作。",
};

test("合法输入放行", () => {
  assert.deepEqual(validateLeadInput(VALID), { ok: true });
});

test("evidenceReq 可空也放行", () => {
  const withEvidence = { ...VALID, evidenceReq: "希望留存交付物清单" };
  assert.deepEqual(validateLeadInput(withEvidence), { ok: true });
});

test("姓名为空或超长拒收", () => {
  assert.deepEqual(validateLeadInput({ ...VALID, name: "" }), { ok: false, field: "name" });
  assert.deepEqual(
    validateLeadInput({ ...VALID, name: "a".repeat(LEAD_LIMITS.name + 1) }),
    { ok: false, field: "name" },
  );
});

test("邮箱格式非法或超长拒收", () => {
  assert.deepEqual(validateLeadInput({ ...VALID, email: "not-an-email" }), {
    ok: false,
    field: "email",
  });
  assert.deepEqual(
    validateLeadInput({ ...VALID, email: `${"a".repeat(LEAD_LIMITS.email)}@x.com` }),
    { ok: false, field: "email" },
  );
});

test("需求类型与留言必填、超长拒收", () => {
  assert.deepEqual(validateLeadInput({ ...VALID, reqType: "" }), { ok: false, field: "reqType" });
  assert.deepEqual(validateLeadInput({ ...VALID, message: "" }), { ok: false, field: "message" });
  assert.deepEqual(
    validateLeadInput({ ...VALID, message: "x".repeat(LEAD_LIMITS.message + 1) }),
    { ok: false, field: "message" },
  );
});

test("证据要求超长拒收（可空但有上限）", () => {
  assert.deepEqual(
    validateLeadInput({ ...VALID, evidenceReq: "x".repeat(LEAD_LIMITS.evidenceReq + 1) }),
    { ok: false, field: "evidenceReq" },
  );
});

test("状态流转：回复只允许新线索/垃圾，关闭不允许已在关闭态", () => {
  assert.equal(leadTransitionAllowed("reply", "NEW"), true);
  assert.equal(leadTransitionAllowed("reply", "SPAM"), true);
  assert.equal(leadTransitionAllowed("reply", "REPLIED"), false);
  assert.equal(leadTransitionAllowed("reply", "ARCHIVED"), false);

  assert.equal(leadTransitionAllowed("close", "NEW"), true);
  assert.equal(leadTransitionAllowed("close", "REPLIED"), true);
  assert.equal(leadTransitionAllowed("close", "ARCHIVED"), false);
});

test("审计条目：动作、目标类型与附加元数据形态", () => {
  const entry = leadAuditEntry("visitor", "lead.create", { id: "lead_1", status: "NEW" }, { reqType: "项目合作" });
  assert.deepEqual(entry, {
    actorId: "visitor",
    action: "lead.create",
    targetType: "Lead",
    targetId: "lead_1",
    meta: { status: "NEW", reqType: "项目合作" },
  });
});

test("防刷：蜜罐命中静默放行（回成功口径，不入库由路由层执行）", () => {
  assert.deepEqual(
    leadAntiSpam({ website: "http://spam.example", renderedAt: 0, now: 1000 }),
    { verdict: "silent" },
  );
  assert.deepEqual(
    leadAntiSpam({ website: "   ", renderedAt: 1000, now: 1000 + LEAD_MIN_FILL_MS }),
    { verdict: "ok" },
  );
});

test("防刷：填写时长差 1 毫秒拒收，满 3 秒放行", () => {
  assert.deepEqual(
    leadAntiSpam({ website: "", renderedAt: 1000, now: 1000 + LEAD_MIN_FILL_MS - 1 }),
    { verdict: "too_fast" },
  );
  assert.deepEqual(
    leadAntiSpam({ website: "", renderedAt: 1000, now: 1000 + LEAD_MIN_FILL_MS }),
    { verdict: "ok" },
  );
});

test("防刷：renderedAt 缺失或非法同判过快（不给机器人钻空子）", () => {
  assert.deepEqual(leadAntiSpam({ website: "", renderedAt: 0, now: 999999 }), { verdict: "too_fast" });
  assert.deepEqual(leadAntiSpam({ website: "", renderedAt: NaN, now: 999999 }), { verdict: "too_fast" });
  assert.deepEqual(leadAntiSpam({ website: "", renderedAt: -1, now: 999999 }), { verdict: "too_fast" });
});
