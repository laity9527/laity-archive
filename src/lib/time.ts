/**
 * 文件：src/lib/time.ts
 * 描述：展示层时间格式化：UTC 时间戳统一成"YYYY-MM-DD HH:mm UTC"字样
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 从 Seal.tsx 与 Timeline.tsx 收敛同名重复定义
 */

export function formatUtc(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
