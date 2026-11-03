/**
 * 文件：tests/time.test.ts
 * 描述：展示层时间格式化的回归测试：一律按 UTC 渲染并显式标注，不受本机时区影响
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（AGENTS.md 规定时间存 UTC、展示层再转，这里锁住"展示层不偷换时区"）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatUtc } from "../src/lib/time.ts";

test("UTC 时刻渲染成分隔式并带 UTC 标注", () => {
  assert.equal(formatUtc(new Date(Date.UTC(2026, 2, 12, 8, 0, 0))), "2026-03-12 08:00 UTC");
});

test("分钟补零，不出现 8:5 这种写法", () => {
  assert.equal(formatUtc(new Date(Date.UTC(2026, 0, 5, 9, 7))), "2026-01-05 09:07 UTC");
});

test("只取到分钟，秒与毫秒不外泄", () => {
  assert.equal(formatUtc(new Date("2026-11-03T00:00:59.999Z")), "2026-11-03 00:00 UTC");
});

test("同一时刻在跨日边界上仍按 UTC 日切，不受本机时区影响", () => {
  const justBeforeMidnight = new Date(Date.UTC(2026, 10, 2, 23, 59));

  assert.equal(formatUtc(justBeforeMidnight), "2026-11-02 23:59 UTC");
  assert.equal(formatUtc(new Date(Date.UTC(2026, 10, 3, 0, 0))), "2026-11-03 00:00 UTC");
});
