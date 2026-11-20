/**
 * 文件：tests/evidence-constants.test.ts
 * 描述：V5 Phase 0 常量单源回归：对外文案逐字锚定、src/ 整句 grep 门禁（含扫描器自证）、
 *       措辞红线词检查、复算口径常量与 D5 哈希实现的独立对拍
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 0）。文案锚点是负责人已裁定口径的逐字副本——
 *               改常量必须先过这里，等于强制走点名授权；grep 门禁用整句匹配，
 *               避免文件头修改记录里的部分子串造成假红
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ABOUT_DIGEST_CLAUSE,
  EVIDENCE_DISCLAIMER,
  HASH_RECOMPUTE_NOTE,
  LOGS_HALL_DESCRIPTION,
  PRIVACY_HASH_PARAGRAPH,
  PUBLISH_ACTION_NOTE,
  tagPageDescription,
} from "../src/lib/evidence-constants.ts";
import { computeContentHash } from "../src/lib/content-hash.ts";

// 逐字锚点：与收编前六处散落文案一字不差（2026-11-18 收编时核对过原文）
const ANCHORS: Record<string, string> = {
  HASH_RECOMPUTE_NOTE: "SHA-256(标题 + 换行 + BEFORE + 换行 + AFTER)，UTF-8，小写十六进制",
  PRIVACY_HASH_PARAGRAPH:
    "每条日志在发布时会把「标题 + 判断正文 + 验证正文」按固定顺序拼接后计算 SHA-256 摘要，并记录服务器的 UTC 时间，摘要与发布时间随详情页一起公开。这意味着已公开的内容本身是可被第三方独立核验的，请勿在正文中写入不便公开的信息。",
  ABOUT_DIGEST_CLAUSE: "底部带这一版正文的 SHA-256 摘要与服务器发布时间，可以和页面上一字一字对。",
  LOGS_HALL_DESCRIPTION:
    "按项目与标签筛选的开发复盘：每条都分成 BEFORE 判断与 AFTER 验证两段，页尾附正文 SHA-256 摘要与发布时间，可核对是否被改动。",
  PUBLISH_ACTION_NOTE: "发布 = 先保存这张表单里的内容，再按它算 SHA-256 并记服务器时间",
  EVIDENCE_DISCLAIMER:
    "本站只证明「内容自发布起未被改动」与「服务记录的发布时间」，不构成作者身份、内容真实性或法律效力的认定。",
};

const VALUES: Record<string, string> = {
  HASH_RECOMPUTE_NOTE,
  PRIVACY_HASH_PARAGRAPH,
  ABOUT_DIGEST_CLAUSE,
  LOGS_HALL_DESCRIPTION,
  PUBLISH_ACTION_NOTE,
  EVIDENCE_DISCLAIMER,
};

// 标签页是模板：拆成前缀与不变后缀两段整句判据
const TAG_PREFIX = "该标签下共 ${";
const TAG_SUFFIX = "条已发布日志，均为 Before/After 开发复盘，附正文 SHA-256 摘要与发布时间。";

test("六条常量与已裁定口径逐字一致（改一个字就红）", () => {
  for (const [name, anchor] of Object.entries(ANCHORS)) {
    assert.equal(VALUES[name], anchor, `${name} 措辞漂移`);
  }
});

test("标签页描述模板：条数插值正确、其余逐字不变", () => {
  assert.equal(
    tagPageDescription(12),
    "该标签下共 12 条已发布日志，均为 Before/After 开发复盘，附正文 SHA-256 摘要与发布时间。",
  );
  assert.equal(
    tagPageDescription(0),
    "该标签下共 0 条已发布日志，均为 Before/After 开发复盘，附正文 SHA-256 摘要与发布时间。",
  );
});

function srcFiles(includeConstants: boolean): string[] {
  const entries = readdirSync("src", { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .filter((p) => includeConstants || !p.endsWith("evidence-constants.ts"));
}

function findLiteral(literal: string, files: string[]): string[] {
  return files.filter((p) => readFileSync(p, "utf8").includes(literal));
}

test("单源门禁：src/ 内除常量文件外不得出现任何一条整句", () => {
  const files = srcFiles(false);
  assert.ok(files.length > 50, `扫描基数异常：只扫到 ${files.length} 个文件`);
  const literals = [...Object.values(ANCHORS), TAG_SUFFIX];
  for (const literal of literals) {
    const hits = findLiteral(literal, files);
    assert.deepEqual(hits, [], `散落文案命中：${hits.join(", ")}`);
  }
  // 模板前缀带插值起点，正常代码里不会以字面量形式出现
  const prefixHits = findLiteral(TAG_PREFIX, files);
  assert.deepEqual(prefixHits, [], `标签模板前缀散落：${prefixHits.join(", ")}`);
});

test("扫描器自证：把常量文件算进来必须全命中（证明门禁能红）", () => {
  const files = srcFiles(true).filter((p) => p.endsWith("evidence-constants.ts"));
  assert.equal(files.length, 1);
  for (const literal of [...Object.values(ANCHORS), TAG_SUFFIX, TAG_PREFIX]) {
    assert.equal(findLiteral(literal, files).length, 1, "扫描器失效：常量文件自身都扫不到");
  }
});

test("措辞红线：常量不得出现承诺性/法律性词汇", () => {
  const forbidden = ["不可篡改", "司法存证", "公证", "区块链", "防伪认证"];
  for (const [name, value] of Object.entries({ ...VALUES, TAG_TEMPLATE: tagPageDescription(1) })) {
    for (const word of forbidden) {
      assert.ok(!value.includes(word), `${name} 含红线词「${word}」`);
    }
  }
});

test("复算口径常量与 D5 实现独立对拍：按常量描述的拼接方式直接算 SHA-256", () => {
  const title = "决定放弃本地搜索，改用索引预构建";
  const before = "构建耗时从 3.2s 涨到 11.8s，计划改为构建期预生成索引。";
  const after = "预构建后首次打开 1.1s，构建期多 4s，可接受。";
  // 不经 content-hash.ts，按 HASH_RECOMPUTE_NOTE 的文字描述独立拼串计算
  const independent = createHash("sha256")
    .update(`${title}\n${before}\n${after}`, "utf8")
    .digest("hex");
  assert.equal(independent, computeContentHash(title, before, after));
  assert.equal(independent, "a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5");
  // 常量声称的性质：UTF-8、小写十六进制
  assert.match(independent, /^[0-9a-f]{64}$/);
  assert.ok(HASH_RECOMPUTE_NOTE.includes("SHA-256"));
  assert.ok(HASH_RECOMPUTE_NOTE.includes("UTF-8"));
});

test("AFTER 缺省时按空串拼接：独立对拍同样成立", () => {
  const title = "t";
  const before = "b";
  const independent = createHash("sha256").update(`${title}\n${before}\n`, "utf8").digest("hex");
  assert.equal(independent, computeContentHash(title, before, null));
  assert.equal(independent, computeContentHash(title, before));
});