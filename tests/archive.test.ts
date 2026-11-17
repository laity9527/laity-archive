/**
 * 文件：tests/archive.test.ts
 * 描述：归档分组的回归测试：年月切分、年降序/月降序、组内保持传入顺序、空输入与计数
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建。分组逻辑本轮刚从 getArchive() 抽成纯函数，先用测试把三条口径钉死：
 *               ① 按 UTC 切年月（不在展示层做时区换算）；② 年降序 → 月降序；③ 组内顺序沿用查询结果
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupArchive, shouldShowYearBar, YEAR_BAR_MIN_ENTRIES, type ArchiveEntry } from "../src/lib/archive.ts";

function entry(id: string, iso: string): ArchiveEntry {
  return {
    id,
    title: id,
    slug: id,
    handle: "zhanglei",
    projectName: "laity-archive",
    beforeDate: new Date(iso),
  };
}

test("按年与月分组：同年同月合并，跨月跨年各自成组", () => {
  const years = groupArchive([
    entry("a", "2026-11-06T05:00:00.000Z"),
    entry("b", "2026-11-02T05:00:00.000Z"),
    entry("c", "2026-10-30T05:00:00.000Z"),
    entry("d", "2025-12-31T05:00:00.000Z"),
  ]);

  assert.equal(years.length, 2);
  assert.equal(years[0].year, "2026");
  assert.equal(years[0].count, 3);
  assert.deepEqual(
    years[0].months.map((month) => month.key),
    ["2026-11", "2026-10"],
  );
  assert.deepEqual(
    years[0].months[0].items.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(years[1].year, "2025");
});

test("年份降序、月份降序：不依赖输入顺序", () => {
  const years = groupArchive([
    entry("old", "2024-03-01T00:00:00.000Z"),
    entry("new", "2026-01-15T00:00:00.000Z"),
    entry("mid", "2025-07-01T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    years.map((year) => year.year),
    ["2026", "2025", "2024"],
  );

  const mixed = groupArchive([
    entry("jan", "2026-01-31T00:00:00.000Z"),
    entry("dec", "2026-12-01T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    mixed[0].months.map((month) => month.key),
    ["2026-12", "2026-01"],
  );
});

test("组内保持传入顺序（排序口径归查询层，分组层不另立一套）", () => {
  const years = groupArchive([
    entry("first", "2026-11-06T00:00:00.000Z"),
    entry("second", "2026-11-05T00:00:00.000Z"),
    entry("third", "2026-11-05T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    years[0].months[0].items.map((item) => item.id),
    ["first", "second", "third"],
  );
});

test("按月切分用 UTC：同一本地日跨 UTC 日界时仍按 UTC 归组", () => {
  // 2026-11-01T00:30:00Z 与 2026-10-31T23:30:00Z 只差一小时，但跨月
  const years = groupArchive([
    entry("nov", "2026-11-01T00:30:00.000Z"),
    entry("oct", "2026-10-31T23:30:00.000Z"),
  ]);

  assert.deepEqual(
    years[0].months.map((month) => month.key),
    ["2026-11", "2026-10"],
  );
});

test("空输入返回空数组", () => {
  assert.deepEqual(groupArchive([]), []);
});

test("count 是组内条目总数，不是月份数", () => {
  const years = groupArchive([
    entry("a", "2026-11-06T00:00:00.000Z"),
    entry("b", "2026-11-01T00:00:00.000Z"),
    entry("c", "2026-09-01T00:00:00.000Z"),
  ]);

  assert.equal(years[0].count, 3);
  assert.equal(years[0].months.length, 2);
});

test("年份跳转条：等于阈值为假，超过阈值才显示", () => {
  assert.equal(shouldShowYearBar(YEAR_BAR_MIN_ENTRIES), false);
  assert.equal(shouldShowYearBar(YEAR_BAR_MIN_ENTRIES + 1), true);
});

test("年份跳转条：空库、单条与非法数字都不显示", () => {
  assert.equal(shouldShowYearBar(0), false);
  assert.equal(shouldShowYearBar(1), false);
  assert.equal(shouldShowYearBar(Number.NaN), false);
});
