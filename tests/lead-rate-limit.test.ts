/**
 * 文件：tests/lead-rate-limit.test.ts
 * 描述：线索提交内存限流回归：单 key 窗口内只放行一次、窗口外放行、不同 key 互不影响
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 7）。判定走纯函数 rateLimitDecision（传入存储 Map）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAD_RATE_WINDOW_MS, rateLimitDecision } from "../src/lib/lead-rate-limit.ts";

const WINDOW = LEAD_RATE_WINDOW_MS;

test("窗口内首次提交放行并记录时间", () => {
  const store = new Map<string, number>();
  const decision = rateLimitDecision(store, "1.2.3.4", 1_000_000);
  assert.deepEqual(decision, { allowed: true, retryAfterMs: 0 });
  assert.equal(store.get("1.2.3.4"), 1_000_000);
});

test("窗口内二次提交被拦，回出剩余等待时间", () => {
  const store = new Map<string, number>();
  rateLimitDecision(store, "1.2.3.4", 1_000_000);
  const decision = rateLimitDecision(store, "1.2.3.4", 1_000_000 + 60_000);
  assert.equal(decision.allowed, false);
  assert.equal(decision.retryAfterMs, WINDOW - 60_000);
});

test("窗口边缘：差 1 毫秒仍拦截，满窗即放行", () => {
  const store = new Map<string, number>();
  rateLimitDecision(store, "ip-a", 0);

  const justInside = rateLimitDecision(store, "ip-a", WINDOW - 1);
  assert.equal(justInside.allowed, false);

  const atEdge = rateLimitDecision(store, "ip-a", WINDOW);
  assert.equal(atEdge.allowed, true);
});

test("不同 IP 互不影响", () => {
  const store = new Map<string, number>();
  rateLimitDecision(store, "ip-a", 0);
  const other = rateLimitDecision(store, "ip-b", 10);
  assert.equal(other.allowed, true);
});

test("被拦的 key 不会刷新存储时间（等待时长不缩短）", () => {
  const store = new Map<string, number>();
  rateLimitDecision(store, "ip-a", 0);
  rateLimitDecision(store, "ip-a", 10_000);
  assert.equal(store.get("ip-a"), 0);
  const decision = rateLimitDecision(store, "ip-a", 20_000);
  assert.equal(decision.retryAfterMs, WINDOW - 20_000);
});
