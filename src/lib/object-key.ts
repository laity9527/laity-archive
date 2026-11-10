/**
 * 文件：src/lib/object-key.ts
 * 描述：对象存储键的服务端生成与安全断言（纯计算，拆出来才能被 node --test 覆盖，同 image-signature 的拆法）
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 从 src/lib/oss.ts 拆出（I061）：断言原先只允许小写，而时间戳来自 toISOString()
 *               必然带大写 T 与 Z，自己生成的每个键都被判死；断言与生成器分居两处，没人发现
 * - 2026-11-09: V2.0 Step 4-B：键加租户段，logs/<userId>/<YYYY-MM>/…；userId 来自服务端会话
 *               （cuid），逐段断言不变——恶意值拼出 .. 段照样被拒，RAM 策略 logs/* 仍覆盖
 */

// 允许大写是必要的：ISO 时间戳里的 T 与 Z 就是大写
const SAFE_CHARS = /^[a-zA-Z0-9./-]+$/;

export function buildObjectKey(now: Date, userId: string, ext: string, rand: string) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  return `logs/${userId}/${year}-${month}/${stamp}-${rand}.${ext}`;
}

// 单看字符集挡不住穿越：`.` 与 `/` 都在白名单里，`logs/../etc/passwd` 照样通过
// ——上一轮的断言只是"看起来在防穿越"（I061）。这里逐段判，空段、. 与 .. 全拒，
// 并要求键确实落在 logs/ 前缀下（与 RAM 策略的 resources 限定一致）
export function isObjectKeySafe(key: string) {
  if (!SAFE_CHARS.test(key) || !key.startsWith("logs/")) {
    return false;
  }

  return key.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
