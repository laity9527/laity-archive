/**
 * 文件：tests/labels.test.ts
 * 描述：展示层枚举映射的回归测试：已知取值走中文映射、未知取值原样输出、日志条数的量词格式
 * 作者：张磊
 * 创建日期：2026-11-05
 * 修改记录：
 * - 2026-11-05: 初始创建（映射被首页、看板与日志大厅共用，且未知值必须原样露出而不是编造一个中文词）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { kindLabel, logsCountLabel, statusLabel } from "../src/lib/labels.ts";

test("kindLabel 覆盖库里的三个取值", () => {
  assert.equal(kindLabel("product"), "产品");
  assert.equal(kindLabel("tool"), "工具");
  assert.equal(kindLabel("site"), "站点");
});

test("statusLabel 覆盖库里的三个取值", () => {
  assert.equal(statusLabel("WIP"), "进行中");
  assert.equal(statusLabel("LIVE"), "已上线");
  assert.equal(statusLabel("ARCHIVED"), "已归档");
});

test("未知取值原样输出，不编造中文词也不抛错", () => {
  assert.equal(kindLabel("hardware"), "hardware");
  assert.equal(kindLabel(""), "");
  assert.equal(statusLabel("PAUSED"), "PAUSED");
  // 大小写敏感：库里存的是 product/WIP，误写成 Product 或 wip 时按未知值原样露出，便于发现问题
  assert.equal(kindLabel("Product"), "Product");
  assert.equal(statusLabel("wip"), "wip");
});

test("logsCountLabel 带量词且零也照实显示", () => {
  assert.equal(logsCountLabel(1), "1 篇日志");
  assert.equal(logsCountLabel(0), "0 篇日志");
  assert.equal(logsCountLabel(12), "12 篇日志");
});
