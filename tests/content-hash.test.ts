/**
 * 文件：tests/content-hash.test.ts
 * 描述：D5 存证摘要口径的回归测试：拼接顺序、空值处理、已知向量的十六进制结果
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（上线基线：口径变一次就必须被发现一次）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { computeContentHash } from "../src/lib/content-hash.ts";

const TITLE = "决定放弃本地搜索，改用索引预构建";
const BEFORE = "构建耗时从 3.2s 涨到 11.8s，计划改为构建期预生成索引。";
const AFTER = "预构建后首次打开 1.1s，构建期多 4s，可接受。";

// 与 prisma/seed.ts 产出的库中值、以及详情页印章显示值同一条：口径一改，这条立刻红
const KNOWN = "a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5";

test("已知向量与库中存证值一致", () => {
  assert.equal(computeContentHash(TITLE, BEFORE, AFTER), KNOWN);
});

test("输出是 64 位小写十六进制", () => {
  const hash = computeContentHash(TITLE, BEFORE, AFTER);

  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("AFTER 为 null 与为空串时同值（按空字符串拼接）", () => {
  assert.equal(computeContentHash(TITLE, BEFORE, null), computeContentHash(TITLE, BEFORE, ""));
});

test("字段顺序或内容变化必须改变摘要", () => {
  const base = computeContentHash(TITLE, BEFORE, AFTER);

  assert.notEqual(computeContentHash(TITLE, AFTER, BEFORE), base);
  assert.notEqual(computeContentHash(`${TITLE} `, BEFORE, AFTER), base);
});

test("字段内含换行时三段的切分不再唯一——这是口径的已知性质，不是缺陷", () => {
  // 两个不同的 (标题, BEFORE, AFTER) 三元组可以拼出同一个字符串：
  //   ("x", "b\nc", "d") 与 ("x", "b", "c\nd") 都是 "x\nb\nc\nd"
  // 现实里内容只有站长一人撰写、且复核是拿库里存的同一组三元值重算，所以撞不上；
  // 写出来是为了让以后改口径的人知道：若要彻底消除歧义，得改成长度前缀或 JSON 规范序列化
  assert.equal(computeContentHash("x", "b\nc", "d"), computeContentHash("x", "b", "c\nd"));
  assert.equal(computeContentHash("a\nb", "c", "d"), computeContentHash("a", "b\nc", "d"));
});
