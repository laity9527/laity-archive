/**
 * 文件：tests/version-conflict.test.ts
 * 描述：回填脚本冲突判据回归：(traceId, version) 全局去重，重复即报错清单（dry-run 据此终止）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 8：回填冲突场景 dry-run 报错测试的判据单源）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { findVersionConflicts } from "../src/lib/version-conflict.ts";

test("无重复槽位：冲突清单为空", () => {
  assert.deepEqual(
    findVersionConflicts([
      { traceId: "t1", version: 1 },
      { traceId: "t1", version: 2 },
      { traceId: "t2", version: 1 },
    ]),
    [],
  );
});

test("空槽位集合：冲突清单为空", () => {
  assert.deepEqual(findVersionConflicts([]), []);
});

test("同轨迹同版本重复：报出具体槽位与次数", () => {
  const conflicts = findVersionConflicts([
    { traceId: "t1", version: 1 },
    { traceId: "t2", version: 1 },
    { traceId: "t1", version: 1 },
    { traceId: "t1", version: 2 },
  ]);

  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0], /^trace t1：版本号 1 出现 2 次$/);
});

test("不同轨迹同版本号不算冲突", () => {
  assert.deepEqual(
    findVersionConflicts([
      { traceId: "a", version: 3 },
      { traceId: "b", version: 3 },
      { traceId: "c", version: 3 },
    ]),
    [],
  );
});

test("同一槽位三次重复：次数如实计数", () => {
  const conflicts = findVersionConflicts([
    { traceId: "t9", version: 7 },
    { traceId: "t9", version: 7 },
    { traceId: "t9", version: 7 },
  ]);

  assert.deepEqual(conflicts, ["trace t9：版本号 7 出现 3 次"]);
});
