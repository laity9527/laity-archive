import assert from "node:assert/strict";
import { test } from "node:test";
import { seriesProgress, type SeriesRow } from "../src/lib/series.ts";

const at = (day: number) => new Date(Date.UTC(2026, 10, day));

const rows: SeriesRow[] = [
  { slug: "c", series: "D30", beforeDate: at(20) },
  { slug: "a", series: "D30", beforeDate: at(10) },
  { slug: "b", series: "D30", beforeDate: at(15) },
  { slug: "x", series: "F26", beforeDate: at(12) },
  { slug: "y", series: null, beforeDate: at(11) },
];

test("系列进度：按决策时间升序编号", () => {
  assert.deepEqual(seriesProgress(rows, "a"), { name: "D30", position: 1, total: 3 });
  assert.deepEqual(seriesProgress(rows, "b"), { name: "D30", position: 2, total: 3 });
  assert.deepEqual(seriesProgress(rows, "c"), { name: "D30", position: 3, total: 3 });
});

test("系列进度：不同系列各算各的；无系列或未命中返回 null", () => {
  assert.deepEqual(seriesProgress(rows, "x"), { name: "F26", position: 1, total: 1 });
  assert.equal(seriesProgress(rows, "y"), null);
  assert.equal(seriesProgress(rows, "missing"), null);
});

test("系列进度：同一天的两篇用 slug 作稳定次键", () => {
  const sameDay: SeriesRow[] = [
    { slug: "b", series: "S", beforeDate: at(10) },
    { slug: "a", series: "S", beforeDate: at(10) },
  ];

  assert.deepEqual(seriesProgress(sameDay, "a"), { name: "S", position: 1, total: 2 });
  assert.deepEqual(seriesProgress(sameDay, "b"), { name: "S", position: 2, total: 2 });
});

test("系列进度：空行集返回 null", () => {
  assert.equal(seriesProgress([], "a"), null);
});
