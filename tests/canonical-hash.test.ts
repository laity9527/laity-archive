/**
 * 文件：tests/canonical-hash.test.ts
 * 描述：V5 Phase 1 双轨哈希回归：v1 冻结口径（委托 content-hash.ts）与 v2 规范化口径
 *       （CRLF→LF / 零宽字符 / 行尾空白）的向量测试
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建。向量覆盖换行多形态、四种零宽字符、行尾空白、v1/v2 差异与标题不规范化边界
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  computeContentHashV1,
  computeContentHashV2,
  normalizeContent,
} from "../src/lib/canonical-hash.ts";
import { computeContentHash } from "../src/lib/content-hash.ts";

const TITLE = "决定放弃本地搜索，改用索引预构建";
const BEFORE = "构建耗时从 3.2s 涨到 11.8s，计划改为构建期预生成索引。";
const AFTER = "预构建后首次打开 1.1s，构建期多 4s，可接受。";

test("v1 委托 content-hash.ts：与冻结口径逐字节一致（已知向量）", () => {
  assert.equal(
    computeContentHashV1(TITLE, BEFORE, AFTER),
    "a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5",
  );
  assert.equal(computeContentHashV1(TITLE, BEFORE, AFTER), computeContentHash(TITLE, BEFORE, AFTER));
});

test("v2 干净正文：与独立拼串的 SHA-256 一致", () => {
  const independent = createHash("sha256")
    .update(`${TITLE}\n${BEFORE}\n${AFTER}`, "utf8")
    .digest("hex");
  assert.equal(computeContentHashV2(TITLE, BEFORE, AFTER), independent);
});

test("v2：CRLF 与 LF 等价（规范化消除换行形态差异）", () => {
  assert.equal(computeContentHashV2(TITLE, "a\r\nb", "c\r\nd"), computeContentHashV2(TITLE, "a\nb", "c\nd"));
  assert.equal(computeContentHashV2(TITLE, "a\r\nb", null), computeContentHashV2(TITLE, "a\nb", ""));
});

test("v2：四种零宽字符全部剔除", () => {
  const withZw = `a​b‌c‍d﻿e`;
  assert.equal(computeContentHashV2(TITLE, withZw, ""), computeContentHashV2(TITLE, "abcde", ""));
  assert.equal(normalizeContent(withZw), "abcde");
});

test("v2：行尾空白收敛（空格与制表符）", () => {
  assert.equal(computeContentHashV2(TITLE, "x  \n y\t\n", ""), computeContentHashV2(TITLE, "x\n y\n", ""));
  assert.equal(normalizeContent("x  \n y\t\n"), "x\n y\n");
});

test("v2：AFTER 缺省与空串同值", () => {
  assert.equal(computeContentHashV2(TITLE, BEFORE, null), computeContentHashV2(TITLE, BEFORE, ""));
});

test("v1 不规范化：同一正文换行形态不同则摘要不同（历史口径冻结的语义）", () => {
  assert.notEqual(computeContentHashV1(TITLE, "a\r\nb", ""), computeContentHashV1(TITLE, "a\nb", ""));
  assert.notEqual(computeContentHashV2(TITLE, "a\r\nb", ""), computeContentHashV1(TITLE, "a\r\nb", ""));
});

test("v2 只规范化正文：标题不参与规范化（标识不是正文）", () => {
  const zwTitle = `${TITLE}​`;
  assert.notEqual(computeContentHashV2(zwTitle, BEFORE, AFTER), computeContentHashV2(TITLE, BEFORE, AFTER));
});

test("normalizeContent：幂等（规范化结果再规范化不变）", () => {
  const once = normalizeContent("a​b\r\nc  \n");
  assert.equal(normalizeContent(once), once);
});