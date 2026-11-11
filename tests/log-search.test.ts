/**
 * 文件：tests/log-search.test.ts
 * 描述：matchLog 纯函数回归测试：大小写不敏感、tags 子串、正文命中、afterContent 为空、空关键词
 * 作者：张磊
 * 创建日期：2026-11-11
 * 修改记录：
 * - 2026-11-11: 初始创建（V2.1 全局搜索的匹配口径：四字段子串匹配，纯函数化便于未来换 SQL 全文检索实现）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { matchLog } from "../src/lib/log-search.ts";

const log = {
  title: "重构日志大厅筛选",
  beforeContent: "BEFORE 判断：筛选维度散落在页面层。",
  afterContent: "AFTER 验证：双层筛选上线，回归通过。",
  tags: ["重构", "性能优化"],
};

test("大小写不敏感：关键词大小写互换均命中正文里的大写 BEFORE", () => {
  assert.equal(matchLog(log, "BEFORE"), true);
  assert.equal(matchLog(log, "before"), true);
});

test("tags 子串匹配：短词命中长标签（性能 → 性能优化）", () => {
  assert.equal(matchLog(log, "性能"), true);
  assert.equal(matchLog(log, "重构"), true);
});

test("正文命中：关键词出现在 beforeContent 与 afterContent", () => {
  assert.equal(matchLog(log, "双层筛选"), true);
  assert.equal(matchLog(log, "回归通过"), true);
});

test("标题命中：关键词只出现在 title", () => {
  assert.equal(matchLog(log, "日志大厅"), true);
});

test("afterContent 为 null 时不炸，仍能命中其他字段", () => {
  assert.equal(matchLog({ ...log, afterContent: null }, "AFTER"), false);
  assert.equal(matchLog({ ...log, afterContent: null }, "重构"), true);
});

test("无命中返回 false；空关键词与纯空白视为不过滤", () => {
  assert.equal(matchLog(log, "不存在的关键词"), false);
  assert.equal(matchLog(log, ""), true);
  assert.equal(matchLog(log, "   "), true);
});
