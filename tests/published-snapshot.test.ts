import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePublishedSnapshot } from "../src/lib/published-snapshot.ts";

const valid = {
  title: "标题",
  beforeContent: "正文",
  afterContent: "之后",
  lessonLearned: null,
  tags: ["a", 1, "b"],
  series: "S",
  contentHash: "abc",
  publishedAt: "2026-11-16T00:00:00.000Z",
};

test("快照解析：合法对象原样取出，非字符串标签被过滤", () => {
  assert.deepEqual(parsePublishedSnapshot(valid), {
    title: "标题",
    beforeContent: "正文",
    afterContent: "之后",
    lessonLearned: null,
    tags: ["a", "b"],
    series: "S",
    contentHash: "abc",
    publishedAt: "2026-11-16T00:00:00.000Z",
  });
});

test("快照解析：缺硬性字段返回 null", () => {
  assert.equal(parsePublishedSnapshot(null), null);
  assert.equal(parsePublishedSnapshot("x"), null);
  assert.equal(parsePublishedSnapshot([]), null);
  assert.equal(parsePublishedSnapshot({ ...valid, title: 1 }), null);
  assert.equal(parsePublishedSnapshot({ ...valid, beforeContent: null }), null);
  assert.equal(parsePublishedSnapshot({ ...valid, contentHash: undefined }), null);
  assert.equal(parsePublishedSnapshot({ ...valid, publishedAt: 3 }), null);
});

test("快照解析：可选字段缺失按空处理，空系列归一为 null", () => {
  const meta = parsePublishedSnapshot({
    title: "t",
    beforeContent: "b",
    contentHash: "h",
    publishedAt: "2026-11-16T00:00:00.000Z",
    series: "  ",
  });

  assert.equal(meta?.afterContent, null);
  assert.equal(meta?.lessonLearned, null);
  assert.deepEqual(meta?.tags, []);
  assert.equal(meta?.series, null);
});
