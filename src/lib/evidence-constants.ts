/**
 * 文件：src/lib/evidence-constants.ts
 * 描述：存证/摘要对外文案的唯一来源（V5 Phase 0）：复算口径、隐私段、关于页子句、
 *       大厅与标签页描述、发布动作说明，以及 V5 定稿的存证免责口径
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 0 常量单源）。六处散落文案自 Seal/privacy/about/logs/tags/后台编辑页
 *               收编至此，措辞逐字保留（均为负责人已裁定的「内容摘要」口径，不借机改写）；
 *               EVIDENCE_DISCLAIMER 为 V5 定稿免责口径，Phase 1 起接线，本轮不渲染
 *
 * 约束：改动这里任何一个字符串 = 改对外承诺，须负责人点名；
 * tests/evidence-constants.test.ts 用整句 grep 卡「src/ 内不得出现第二处字面量」。
 * 对外措辞红线：只说「内容摘要 / 可核对」，不写「不可篡改 / 司法存证 / 公证 / 区块链」。
 */

/** 复算口径（详情页 EvidencePanel「复算口径」行）：与 src/lib/content-hash.ts 的 D5 实现一一对应 */
export const HASH_RECOMPUTE_NOTE =
  "SHA-256(标题 + 换行 + BEFORE + 换行 + AFTER)，UTF-8，小写十六进制";

/** 隐私页「内容存在哪里」第二段：摘要如何产生、公开什么、对作者的提醒 */
export const PRIVACY_HASH_PARAGRAPH =
  "每条日志在发布时会把「标题 + 判断正文 + 验证正文」按固定顺序拼接后计算 SHA-256 摘要，并记录服务器的 UTC 时间，摘要与发布时间随详情页一起公开。这意味着已公开的内容本身是可被第三方独立核验的，请勿在正文中写入不便公开的信息。";

/** 关于页简介第二段的收尾子句：摘要与发布时间可逐字核对 */
export const ABOUT_DIGEST_CLAUSE =
  "底部带这一版正文的 SHA-256 摘要与服务器发布时间，可以和页面上一字一字对。";

/** 日志大厅 metadata.description */
export const LOGS_HALL_DESCRIPTION =
  "按项目与标签筛选的开发复盘：每条都分成 BEFORE 判断与 AFTER 验证两段，页尾附正文 SHA-256 摘要与发布时间，可核对是否被改动。";

/** 标签聚合页 metadata.description（条数随查询结果变化，模板单源） */
export function tagPageDescription(count: number): string {
  return `该标签下共 ${count} 条已发布日志，均为 Before/After 开发复盘，附正文 SHA-256 摘要与发布时间。`;
}

/** 后台编辑页草稿态的发布动作说明 */
export const PUBLISH_ACTION_NOTE =
  "发布 = 先保存这张表单里的内容，再按它算 SHA-256 并记服务器时间";

/**
 * V5 定稿的存证免责口径（Phase 1 起在详情页/关于页接线，本轮只定稿不渲染）。
 * 边界：只承诺「未改动」与「服务记录的发布时间」，不承诺身份、真实性、法律效力。
 */
export const EVIDENCE_DISCLAIMER =
  "本站只证明「内容自发布起未被改动」与「服务记录的发布时间」，不构成作者身份、内容真实性或法律效力的认定。";