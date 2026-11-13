/**
 * 文件：tests/related.test.ts
 * 描述：相邻日志与相关阅读挑选的回归测试：时间倒序、共享标签优先、同项目兜底、去重与上限
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。锁住「同标签 → 同项目」的回退链与 reason 口径
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { pickNeighbors, pickRelated, type RelatedRow } from "../src/lib/related.ts";

const day = (n: number) => new Date(Date.UTC(2026, 10, n, 0, 0, 0));

function row(
  id: string,
  dayNumber: number,
  tags: string[] = [],
  projectId = "p1",
): RelatedRow {
  return {
    id,
    title: id,
    slug: id,
    tags,
    projectId,
    beforeDate: day(dayNumber),
  };
}

test("时间倒序列表里，上一篇更早、下一篇更新", () => {
  const rows = [row("c", 3), row("b", 2), row("a", 1)];
  const { older, newer } = pickNeighbors(rows, "b");

  assert.equal(older?.id, "a");
  assert.equal(newer?.id, "c");
});

test("首尾条目的缺失一侧返回 null，不越界", () => {
  const rows = [row("c", 3), row("b", 2), row("a", 1)];

  assert.deepEqual(pickNeighbors(rows, "c"), {
    older: rows[1],
    newer: null,
  });
  assert.deepEqual(pickNeighbors(rows, "a"), {
    older: null,
    newer: rows[1],
  });
  assert.deepEqual(pickNeighbors(rows, "missing"), {
    older: null,
    newer: null,
  });
});

test("同标签优先，按共享标签数排序", () => {
  const current = { id: "cur", tags: ["a", "b"], projectId: "p1" };
  const rows = [
    row("two", 4, ["a", "b"]),
    row("one", 3, ["a"]),
    row("none", 2, ["z"]),
  ];

  const result = pickRelated(rows, current, 2);

  assert.deepEqual(result.items.map((item) => item.id), ["two", "one"]);
  assert.equal(result.reason, "tag");
});

test("同标签不足时用同项目最近发布补齐，且不重复", () => {
  const current = { id: "cur", tags: ["a"], projectId: "p1" };
  const rows = [
    row("tagged", 5, ["a"], "p1"),
    row("same-project", 4, [], "p1"),
    row("other-project", 6, [], "p2"),
  ];

  const result = pickRelated(rows, current, 3);

  assert.deepEqual(result.items.map((item) => item.id), [
    "tagged",
    "same-project",
  ]);
  assert.equal(result.reason, "mixed");
});

test("完全没有同标签时回落为同项目，reason 标为 project", () => {
  const current = { id: "cur", tags: ["a"], projectId: "p1" };
  const rows = [row("peer", 3, ["z"], "p1"), row("other", 2, [], "p2")];

  const result = pickRelated(rows, current, 3);

  assert.deepEqual(result.items.map((item) => item.id), ["peer"]);
  assert.equal(result.reason, "project");
});

test("没有任何候选时返回空数组与 null", () => {
  const current = { id: "cur", tags: ["a"], projectId: "p1" };
  assert.deepEqual(pickRelated([row("cur", 1, ["a"])], current), {
    items: [],
    reason: null,
  });
});

test("可排除已作为前后篇展示的条目，不重复推荐", () => {
  const current = { id: "cur", tags: ["a"], projectId: "p1" };
  const rows = [
    row("neighbor", 4, ["a"], "p1"),
    row("related", 3, ["a"], "p1"),
  ];

  const result = pickRelated(rows, current, 3, ["neighbor"]);

  assert.deepEqual(result.items.map((item) => item.id), ["related"]);
});
