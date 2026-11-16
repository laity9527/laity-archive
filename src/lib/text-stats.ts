/**
 * 文件：src/lib/text-stats.ts
 * 描述：正文字数统计纯函数：中文按字、拉丁按词，合计作为编辑器的"体量"数字
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。编辑器的字数统计原先写在组件里，无法单测；抽成纯函数后
 *               “中文按字、拉丁按词、混合文本、空串”这几种口径都能被 node --test 钉住。
 *               阅读时长仍由 src/lib/reading-time.ts 负责（400 字/分钟），本文件不重复实现
 */

/**
 * 中文（含扩展 A 区常用字）按字计，其余连续字母/数字/下划线按词计。
 * 例：`修复 bug 两次` → 中文 4 + 拉丁 1 = 5；`container-query` → 2。
 */
export function countBodyChars(text: string): number {
  const han = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;

  // 先把中文替换成空格再加空格切分，避免“中英紧邻”被算成一个词
  const latin = (
    text.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) ?? []
  ).length;

  return han + latin;
}
