import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bucketWeeklyPublishes,
  trendWeekStarts,
  TREND_WEEKS,
} from "../src/lib/publish-trend.ts";

// 2026-11-18 是周三；本周一为 2026-11-16，12 周窗口起点为 2026-08-31
const NOW = new Date("2026-11-18T12:00:00.000Z");

test("空输入：返回 12 个零桶", () => {
  const counts = bucketWeeklyPublishes([], NOW);

  assert.equal(counts.length, TREND_WEEKS);
  assert.deepEqual(counts, new Array(TREND_WEEKS).fill(0));
});

test("周起点升序且最后一个是本周一 00:00（UTC）", () => {
  const starts = trendWeekStarts(NOW);

  assert.equal(starts.length, TREND_WEEKS);
  assert.equal(starts.at(-1)?.toISOString(), "2026-11-16T00:00:00.000Z");
  assert.equal(starts[0].toISOString(), "2026-08-31T00:00:00.000Z");

  for (let i = 1; i < starts.length; i += 1) {
    assert.ok(starts[i].getTime() > starts[i - 1].getTime());
  }
});

test("边界：周一 00:00 进本周，前一周周日 23:59 进上一周", () => {
  const counts = bucketWeeklyPublishes(
    [
      new Date("2026-11-16T00:00:00.000Z"),
      new Date("2026-11-15T23:59:59.000Z"),
      new Date("2026-11-09T00:00:00.000Z"),
    ],
    NOW,
  );

  assert.equal(counts.at(-1), 1);
  assert.equal(counts.at(-2), 2);
  assert.equal(counts.reduce((sum, value) => sum + value, 0), 3);
});

test("窗口外：起点之前与本周之后（含下周一）都不计入", () => {
  const counts = bucketWeeklyPublishes(
    [
      new Date("2026-08-30T23:59:59.000Z"),
      new Date("2026-08-31T00:00:00.000Z"),
      new Date("2026-11-23T00:00:00.000Z"),
    ],
    NOW,
  );

  assert.equal(counts[0], 1);
  assert.equal(counts.reduce((sum, value) => sum + value, 0), 1);
});

test("窗口大小可调：3 周只切 3 桶", () => {
  const counts = bucketWeeklyPublishes(
    [new Date("2026-11-18T09:00:00.000Z")],
    NOW,
    3,
  );

  assert.deepEqual(counts, [0, 0, 1]);
});
