/**
 * 文件：tests/topics.test.ts
 * 描述：主题映射的回归测试：8 个主题、56 个标签全覆盖且不重复，未知标签不猜测
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。锁住治理文档里「一个标签只归一个主题」的口径；
 *               标签数变化时先改映射表再改用例，不反过来放宽断言
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TOPICS,
  countTopics,
  isTopicKey,
  topicLabel,
  topicOfTag,
  topicTags,
  topicsOfTags,
} from "../src/lib/topics.ts";

test("8 个主题、56 个标签，且没有标签被归到两个主题", () => {
  assert.equal(TOPICS.length, 8);

  const tags = TOPICS.flatMap((topic) => [...topic.tags]);
  assert.equal(tags.length, 56);
  assert.equal(new Set(tags).size, 56);
});

test("每个标签都能映射回它所属的主题", () => {
  for (const topic of TOPICS) {
    for (const tag of topic.tags) {
      assert.equal(topicOfTag(tag), topic.key, tag);
    }
  }
});

test("代表性标签：CSS 词元、框架术语与中文标签都能落位", () => {
  assert.equal(topicOfTag("@container"), "frontend");
  assert.equal(topicOfTag("Server Action"), "security");
  assert.equal(topicOfTag("软著材料"), "copyright");
  assert.equal(topicOfTag("github-sync"), "project");
  assert.equal(topicOfTag("SHA-256"), "data");
});

test("未知标签与空串不猜测，返回 null", () => {
  assert.equal(topicOfTag("不存在的标签"), null);
  assert.equal(topicOfTag(""), null);
  assert.equal(topicOfTag("   "), null);
});

test("一条日志的多个标签去重后按主题顺序返回", () => {
  assert.deepEqual(topicsOfTags(["WCAG", "SHA-256", "WCAG"]), [
    "data",
    "frontend",
  ]);
  assert.deepEqual(topicsOfTags(["github-sync", "ali-oss"]), [
    "deploy",
    "project",
  ]);
  assert.deepEqual(topicsOfTags([]), []);
});

test("主题名可回读，未知 key 原样返回不抛错", () => {
  assert.equal(topicLabel("data"), "数据与存证");
  // @ts-expect-error 故意传越界值，验证运行期兜底
  assert.equal(topicLabel("nope"), "nope");
});

test("主题 key 可校验，topicTags 返回该主题的全部标签", () => {
  assert.equal(isTopicKey("frontend"), true);
  assert.equal(isTopicKey("nope"), false);
  assert.ok(topicTags("frontend").includes("@container"));
  assert.deepEqual(topicTags("copyright"), [
    "软著材料",
    "打印分页",
    "折行",
    "assertWindowFit",
  ]);
});

test("主题计数按日志去重，同一日志多个同主题标签只计一次", () => {
  const counts = countTopics([
    ["视觉令牌", "WCAG"],
    ["@container"],
    ["视觉令牌", "SHA-256"],
    ["未登记的标签"],
  ]);

  assert.equal(counts.get("frontend"), 3);
  assert.equal(counts.get("data"), 1);
  assert.equal(counts.get("deploy"), undefined);
});
