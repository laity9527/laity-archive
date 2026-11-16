/**
 * 文件：src/lib/sort-preference.ts
 * 描述：日志大厅排序偏好的单源：cookie 名与合法值解析（URL 参数优先，其次 cookie）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。排序记忆用 cookie 而不是 localStorage——排序在服务端渲染时就要决定，
 *               cookie 可服务端读、无首屏闪动、关掉 JS 也生效；localStorage 只能先渲染默认顺序再跳一次。
 *               唯一合法值只有 decided / published，其余一律回落 decided
 */

export const SORT_COOKIE = "laity-sort";

export type SortPreferenceValue = "decided" | "published";

/** 解析排序值：只认 published，其余（空、非法、多余参数）一律 decided。 */
export function parseSort(value: string | null | undefined): SortPreferenceValue {
  return value === "published" ? "published" : "decided";
}
