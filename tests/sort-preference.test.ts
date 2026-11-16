/**
 * 文件：tests/sort-preference.test.ts
 * 描述：排序偏好解析的回归测试：只认 published，其余一律回落 decided
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。排序记忆的合法性判定抽到 src/lib/sort-preference.ts，
 *               用测试钉死“UI 之外的脏值（大小写、旧值、空值）”不会改变排序语义
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSort } from "../src/lib/sort-preference.ts";

test("published 原样保留", () => {
  assert.equal(parseSort("published"), "published");
});

test("decided 原样保留", () => {
  assert.equal(parseSort("decided"), "decided");
});

test("空值回落 decided", () => {
  assert.equal(parseSort(undefined), "decided");
  assert.equal(parseSort(null), "decided");
  assert.equal(parseSort(""), "decided");
});

test("大小写与旧值等脏值一律回落 decided", () => {
  assert.equal(parseSort("PUBLISHED"), "decided");
  assert.equal(parseSort("before"), "decided");
  assert.equal(parseSort("published "), "decided");
});
