/**
 * 文件：src/lib/admin-password.ts
 * 描述：后台准入判定：读 ADMIN_PASSWORD，输入与配置值各取 SHA-256 后做常量时间比对
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建，接管原 GitHub 账号 ID 白名单的判定职责
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
