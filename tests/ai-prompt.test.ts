/**
 * 文件：tests/ai-prompt.test.ts
 * 描述：AI Prompt 纯函数层的回归测试：buildPrompt 必须包含全部提交信息与仓库名、AFTER 段必须编号；
 * parseAiResponse 覆盖标准 JSON、markdown 代码块（带/不带 lang）、前后杂质文本、缺键与不可解析四种失败形态。
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（Step 6 Commit 1）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrompt, parseAiResponse } from "../src/lib/ai-prompt.ts";

const commits = [
  "fix(auth): 修正 GitHub 认领逻辑读取 profile 参数",
  "refactor(sync): 抽离 commit 过滤为纯函数",
  "test: 补 ai-prompt 单测",
];

test("buildPrompt 的输出包含全部提交信息与仓库名", () => {
  const prompt = buildPrompt(commits, "laity-archive");
  assert.ok(prompt.includes("laity-archive"));
  for (const message of commits) {
    assert.ok(prompt.includes(message), `提交信息没进 prompt：${message}`);
  }
  assert.match(prompt, /【BEFORE】/);
  assert.match(prompt, /【AFTER】/);
});

test("buildPrompt 先过滤空行再编号，区间连续", () => {
  const prompt = buildPrompt(["  第一笔 ", "", "   ", "第二笔"], "repo");
  assert.match(prompt, /1\. 第一笔/);
  assert.match(prompt, /2\. 第二笔/);
  assert.doesNotMatch(prompt, /3\. /);
});

test("parseAiResponse 解析标准 JSON", () => {
  const draft = parseAiResponse('{"BEFORE":"问题描述","AFTER":"复盘结论"}');
  assert.deepEqual(draft, { beforeContent: "问题描述", afterContent: "复盘结论" });
});

test("parseAiResponse 解析 markdown 代码块包裹（带 json 标记）", () => {
  const draft = parseAiResponse('```json\n{"BEFORE":"B","AFTER":"A"}\n```');
  assert.deepEqual(draft, { beforeContent: "B", afterContent: "A" });
});

test("parseAiResponse 解析 markdown 代码块包裹（不带语言标记）", () => {
  const draft = parseAiResponse('```\n{"BEFORE":"B","AFTER":"A"}\n```');
  assert.deepEqual(draft, { beforeContent: "B", afterContent: "A" });
});

test("parseAiResponse 解析前后带杂质文本的 JSON", () => {
  const draft = parseAiResponse('好的，这是结果：\n{"BEFORE":"B","AFTER":"A"}\n希望有帮助！');
  assert.deepEqual(draft, { beforeContent: "B", afterContent: "A" });
});

test("parseAiResponse 对非法 JSON 返回 null", () => {
  assert.equal(parseAiResponse("完全不是 JSON 的普通文本"), null);
  assert.equal(parseAiResponse(""), null);
  assert.equal(parseAiResponse("123"), null);
});

test("parseAiResponse 缺任一键返回 null", () => {
  assert.equal(parseAiResponse('{"BEFORE":"只有 BEFORE"}'), null);
  assert.equal(parseAiResponse('{"AFTER":"只有 AFTER"}'), null);
});
