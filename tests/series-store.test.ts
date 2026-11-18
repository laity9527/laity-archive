/**
 * 文件：tests/series-store.test.ts
 * 描述：Series slug 纯函数的回归测试：稳定性、前缀/长度、去首尾空白、中文名可用
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V4 P2 Series 实体）。slug 是内部唯一键，不能依赖展示名；
 *               测试只覆盖纯函数，不连接数据库。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { seriesSlug } from "../src/lib/series.ts";

test("同一名称生成同一 slug，且符合 series- + 16 位十六进制", () => {
  const first = seriesSlug("D30 四步切换");
  const second = seriesSlug("D30 四步切换");

  assert.equal(first, second);
  assert.match(first, /^series-[0-9a-f]{16}$/);
});

test("首尾空白不影响 slug", () => {
  assert.equal(seriesSlug("  系列 A  "), seriesSlug("系列 A"));
});

test("不同名称生成不同 slug，中文名可用", () => {
  assert.notEqual(seriesSlug("系列 A"), seriesSlug("系列 B"));
});
