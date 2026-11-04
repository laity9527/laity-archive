/**
 * 文件：src/lib/admin-password.ts
 * 描述：后台准入判定：ADMIN_PASSWORD 的常量时间比对，加上进程内的登录节流
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建，接管原 GitHub 账号 ID 白名单的判定职责
 * - 2026-11-04: 补登录节流：dev 的 next dev 绑 0.0.0.0，登录端点在局域网里直接可达，
 *               而生产的第一道限速在 nginx（limit_req）——应用被直接暴露时这里兜底
 */
import { createHash, timingSafeEqual } from "node:crypto";

// 口令在调用时读取，不在模块加载期读取：构建、类型检查与测试都不该跟着本机 .env 漂移
function configuredPassword() {
  return (process.env.ADMIN_PASSWORD ?? "").trim();
}

export function adminPasswordConfigured() {
  return configuredPassword().length > 0;
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

// 未配置口令一律拒绝：否则"忘了填 ADMIN_PASSWORD"会变成一个谁都能进的开放入口
export function passwordMatches(input: string | null | undefined) {
  const configured = configuredPassword();
  const candidate = input ?? "";

  if (!configured || candidate.length === 0) {
    return false;
  }

  // 两侧都是 32 字节摘要，长度不同的口令也能走固定时间的比较，不泄露口令长度
  return timingSafeEqual(digest(candidate), digest(configured));
}

export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;

type LoginBucket = { failures: number; openedAt: number };

// 进程内计数：多实例不共享，所以它不是"防爆破的完整方案"，只是应用被直接暴露时的兜底
const loginBuckets = new Map<string, LoginBucket>();

// 窗口从第一次失败开始计；过期即视为新窗口，不维护定时器（读的时候判过期，省掉清理任务）
export function attemptsLeft(key: string, now = Date.now()) {
  const bucket = loginBuckets.get(key);

  if (!bucket || now - bucket.openedAt >= LOGIN_WINDOW_MS) {
    return LOGIN_MAX_FAILURES;
  }

  return Math.max(0, LOGIN_MAX_FAILURES - bucket.failures);
}

export function registerFailure(key: string, now = Date.now()) {
  const bucket = loginBuckets.get(key);

  if (!bucket || now - bucket.openedAt >= LOGIN_WINDOW_MS) {
    loginBuckets.set(key, { failures: 1, openedAt: now });

    return;
  }

  bucket.failures += 1;
}

export function clearLoginFailures(key: string) {
  loginBuckets.delete(key);
}

// 只取 X-Forwarded-For 的第一跳：生产由 nginx 写入，本机直连时该头不存在，落到 fallback
export function throttleKeyOf(forwardedFor: string | string[] | undefined, fallback = "local") {
  const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  return first?.split(",")[0]?.trim() || fallback;
}
