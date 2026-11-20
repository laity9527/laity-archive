/**
 * 文件：tests/verify-recompute.test.ts
 * 描述：核验复算回归：assembleVerifyInput 的拼接口径与服务端 v1/v2 哈希逐字节一致
 *       （浏览器 WebCrypto 与服务端 node:crypto 对同一输入串的 SHA-256 必然相同），
 *       以及 isContentHash 的形态校验（/verify 入口、页面与接口共用）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 8：/verify 浏览器复算测试的判据单源）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  assembleVerifyInput,
  computeContentHashV1,
  computeContentHashV2,
  isContentHash,
} from "../src/lib/canonical-hash.ts";

const TITLE = "决定放弃本地搜索，改用索引预构建";
const BEFORE = "构建耗时从 3.2s 涨到 11.8s，计划改为构建期预生成索引。";
const AFTER = "预构建后首次打开 1.1s，构建期多 4s，可接受。";

function digestHex(input: string) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

test("v1：拼接口径与冻结口径逐字节一致（浏览器复算 = 服务端存证）", () => {
  const input = assembleVerifyInput(1, TITLE, BEFORE, AFTER);
  assert.equal(input, `${TITLE}\n${BEFORE}\n${AFTER}`);
  assert.equal(digestHex(input), computeContentHashV1(TITLE, BEFORE, AFTER));
});

test("v2：拼接口径先规范化正文，与 v2 哈希逐字节一致", () => {
  const dirtyBefore = "构建耗时上涨。\r\n行尾空白   \n零宽​‌‍﻿字符";
  const input = assembleVerifyInput(2, TITLE, dirtyBefore, AFTER);
  assert.equal(input, `${TITLE}\n${"构建耗时上涨。\n行尾空白\n零宽字符"}\n${AFTER}`);
  assert.equal(digestHex(input), computeContentHashV2(TITLE, dirtyBefore, AFTER));
});

test("v2：AFTER 为空串时与 null 同口径", () => {
  assert.equal(
    assembleVerifyInput(2, TITLE, BEFORE, null),
    assembleVerifyInput(2, TITLE, BEFORE, ""),
  );
  assert.equal(
    digestHex(assembleVerifyInput(2, TITLE, BEFORE, null)),
    computeContentHashV2(TITLE, BEFORE, null),
  );
});

test("v1 与 v2 对脏正文给出不同输入串（口径差异不被静默吞掉）", () => {
  const dirty = "行\r\n尾   空白​";
  assert.notEqual(
    assembleVerifyInput(1, TITLE, dirty, null),
    assembleVerifyInput(2, TITLE, dirty, null),
  );
});

test("isContentHash：合法 64 位小写十六进制通过", () => {
  assert.equal(isContentHash("a".repeat(64)), true);
  assert.equal(isContentHash(computeContentHashV2(TITLE, BEFORE, AFTER)), true);
});

test("isContentHash：大写、短值、非十六进制、空串一律拒绝", () => {
  assert.equal(isContentHash("A".repeat(64)), false);
  assert.equal(isContentHash("a".repeat(63)), false);
  assert.equal(isContentHash("a".repeat(65)), false);
  assert.equal(isContentHash("g".repeat(64)), false);
  assert.equal(isContentHash(""), false);
  assert.equal(isContentHash("a".repeat(63) + "-"), false);
});
