/**
 * 文件：src/lib/canonical-hash.ts
 * 描述：V5 Phase 1 双轨存证哈希：v1 冻结复用 content-hash.ts 的 D5 原口径（历史记录永不重算），
 *       v2 规范化口径——正文做 CRLF→LF、剔除零宽字符、收敛行尾空白后按同一拼接规则算 SHA-256
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1）。computeContentHashV1 直接委托 content-hash.ts，
 *               保证 v1 口径单源、逐字节不变；v2 只规范化正文（标题不参与规范化，属标识不是正文）
 * - 2026-11-18: 补 assembleVerifyInput（核验面板复算的拼接口径单源，浏览器与服务端共用同一公式）
 *               与 isContentHash（64 位小写十六进制形态校验，/verify 入口与接口共用）
 */
import { createHash } from "node:crypto";
import { computeContentHash } from "./content-hash.ts";
import { HASH_RECOMPUTE_NOTE } from "./evidence-constants.ts";

// 零宽字符：U+200B 零宽空格 / U+200C 零宽不连字 / U+200D 零宽连字 / U+FEFF BOM
const ZERO_WIDTH = new RegExp("[\\u200b\\u200c\\u200d\\ufeff]", "g");

/** v2 规范化：CRLF/CR→LF、剔除零宽字符、收敛每行末尾的空白（空格/制表符） */
export function normalizeContent(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(ZERO_WIDTH, "")
    .replace(/[ \t]+$/gm, "");
}

/** v1 原口径（D5）：直接委托 content-hash.ts，历史版本行复核永远用它，口径冻结 */
export function computeContentHashV1(
  title: string,
  beforeContent: string,
  afterContent?: string | null,
): string {
  return computeContentHash(title, beforeContent, afterContent);
}

/** v2 规范化口径：正文先规范化再按 title + "\n" + before + "\n" + after 拼接，UTF-8 小写十六进制 */
export function computeContentHashV2(
  title: string,
  beforeContent: string,
  afterContent?: string | null,
): string {
  return createHash("sha256")
    .update(
      `${title}\n${normalizeContent(beforeContent)}\n${normalizeContent(afterContent ?? "")}`,
      "utf8",
    )
    .digest("hex");
}

/**
 * 核验复算的拼接口径单源：按 hashVersion 决定正文是否先规范化，返回 digest 的输入串。
 * /verify 面板（WebCrypto）与服务端 computeContentHashV1/V2 必须共用这一公式——
 * 抽成纯函数后，测试用 node:crypto 对同一输入串做 digest，钉住「浏览器复算 = 服务端存证」。
 */
export function assembleVerifyInput(
  hashVersion: 1 | 2,
  title: string,
  beforeContent: string,
  afterContent?: string | null,
): string {
  const before = hashVersion === 2 ? normalizeContent(beforeContent) : beforeContent;
  const after = hashVersion === 2 ? normalizeContent(afterContent ?? "") : (afterContent ?? "");

  return `${title}\n${before}\n${after}`;
}

/** 内容摘要的合法形态：64 位小写十六进制（SHA-256 小写 hex 的完整值） */
export function isContentHash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * 规范化规则的对外文本（核验页/核验接口展示用，与 normalizeContent 的实现一一对应）。
 * 单源：v1 口径直接引用 evidence-constants 的 HASH_RECOMPUTE_NOTE（不复制整句，单源门禁会拦）；
 * 改规则先改 normalizeContent，再同步这段文字，核验页据此告诉读者复算口径。
 */
export const CANONICAL_RULES_TEXT =
  `v1：${HASH_RECOMPUTE_NOTE}，不做任何规范化。` +
  "v2：正文先规范化——CRLF 与 CR 统一为 LF、剔除零宽字符（U+200B / U+200C / U+200D / U+FEFF）、" +
  "收敛每行末尾的空白（空格与制表符），再按与 v1 相同的顺序拼接计算 SHA-256。标题不参与规范化。";