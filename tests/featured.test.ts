/**
 * 文件：tests/featured.test.ts
 * 描述：精选口径的回归测试：只取有日志的项目、日志数优先、同数按最近更新、条数上限与不改入参
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。pickFeatured 本轮从 projects.ts 抽成纯函数，先把首页第一屏的选取规则钉住：
 *               ① 零日志项目不进精选；② 日志数降序；③ 同数按 latest 降序（null 视为最旧）；④ take 截断
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { pickFeatured, type FeaturedCandidate } from "../src/lib/featured.ts";

function item(count: number, iso: string | null): FeaturedCandidate {
  return { count, latest: iso ? new Date(iso) : null };
}

test("零日志项目不进精选", () => {
  const picked = pickFeatured([item(0, null), item(2, "2026-11-01T00:00:00.000Z")]);

  assert.equal(picked.length, 1);
  assert.equal(picked[0].count, 2);
});

test("日志数优先：1 条但更新的项目排在 4 条旧项目之后", () => {
  const picked = pickFeatured([
    item(1, "2026-11-15T00:00:00.000Z"),
    item(4, "2026-01-01T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    picked.map((row) => row.count),
    [4, 1],
  );
});

test("日志数相同按最近更新降序，latest 为 null 视为最旧", () => {
  const picked = pickFeatured([
    item(2, null),
    item(2, "2026-10-01T00:00:00.000Z"),
    item(2, "2026-11-01T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    picked.map((row) => row.latest?.toISOString().slice(0, 10) ?? null),
    ["2026-11-01", "2026-10-01", null],
  );
});

test("take 截断；take=0 返回空；负数按 0 处理", () => {
  const board = [item(3, null), item(2, null), item(1, null)];

  assert.equal(pickFeatured(board).length, 3);
  assert.equal(pickFeatured(board, 2).length, 2);
  assert.deepEqual(pickFeatured(board, 0), []);
  assert.deepEqual(pickFeatured(board, -5), []);
});

test("空看板返回空数组", () => {
  assert.deepEqual(pickFeatured([]), []);
});

test("不修改入参数组顺序", () => {
  const board = [item(1, null), item(3, null)];
  const snapshot = board.map((row) => row.count);

  pickFeatured(board);

  assert.deepEqual(
    board.map((row) => row.count),
    snapshot,
  );
});
