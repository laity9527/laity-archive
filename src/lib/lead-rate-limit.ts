/**
 * 文件：src/lib/lead-rate-limit.ts
 * 描述：线索提交的内存限流（纯函数 + 进程内共享存储）：单 IP 5 分钟只放行一次；
 *       超限不写库、不返回任何线索信息，只回重试等待
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.2）。判定逻辑抽为纯函数 rateLimitDecision
 *               （传入存储 Map）供单测钉住；checkLeadRateLimit 是带共享存储的生产入口
 */
export const LEAD_RATE_WINDOW_MS = 5 * 60 * 1000;

export type RateLimitDecision = { allowed: boolean; retryAfterMs: number };

/** 纯判定：now 之前 windowMs 内同 key 已放行过即拒绝，并回出还需等待的毫秒数 */
export function rateLimitDecision(
  store: Map<string, number>,
  key: string,
  now: number,
  windowMs: number = LEAD_RATE_WINDOW_MS,
): RateLimitDecision {
  const last = store.get(key);

  if (last !== undefined && now - last < windowMs) {
    return { allowed: false, retryAfterMs: windowMs - (now - last) };
  }

  store.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}

// 进程内共享存储：单实例内存限流，多实例部署时各实例独立计数（本阶段单实例口径）
const store = new Map<string, number>();

export function checkLeadRateLimit(key: string, now: number = Date.now()): RateLimitDecision {
  return rateLimitDecision(store, key, now);
}

// 测试与运维辅助：清空存储（单测用新 Map 即可，此函数供需要重置共享态的场景）
export function resetLeadRateLimit(): void {
  store.clear();
}
