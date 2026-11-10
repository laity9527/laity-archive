/**
 * 文件：tests/github-sync-filter.test.ts
 * 描述：同步过滤与草稿拼装的回归测试：四道过滤、slug 净化与截断、单条/合并草稿的字段口径
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 2）。commit 数据全部是注入的哑值，sha 为占位串
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDraft,
  buildDraftSlug,
  filterCommits,
  firstLine,
  groupByRepoDay,
  isMeaningless,
  isMergeCommit,
  sanitizeRepoSlug,
  type RawCommit,
} from "../src/lib/github-sync-filter.ts";
import { SLUG_PATTERN } from "../src/lib/forms.ts";

function commit(overrides: Partial<RawCommit> = {}): RawCommit {
  return {
    sha: "aaa111",
    message: "实现档案看板的取数口径",
    date: "2026-11-10T08:00:00Z",
    repo: "laity9527/laity-archive",
    ...overrides,
  };
}

test("firstLine 只取首行并 trim", () => {
  assert.equal(firstLine("  标题 \n\n正文细节"), "标题");
  assert.equal(firstLine("单行"), "单行");
});

test("去 merge：三类前缀大小写不敏感", () => {
  for (const message of [
    "Merge pull request #12 from foo/bar",
    "merge branch 'main' into dev",
    "Merge remote-tracking branch 'origin/main'",
  ]) {
    assert.equal(isMergeCommit(message), true, `应判为 merge：${message}`);
  }

  assert.equal(isMergeCommit("合并两个取数函数减少重复"), false);
});

test("去无意义：黑名单整词命中，带实义的不误杀", () => {
  for (const message of ["update", "Fix.", "WIP", "first commit", "typo!", "initial commit"]) {
    assert.equal(isMeaningless(message), true, `应判无意义：${message}`);
  }

  for (const message of ["fix critical security vulnerability", "update README with deploy steps"]) {
    assert.equal(isMeaningless(message), false, `不该误杀：${message}`);
  }
});

test("filterCommits：merge、短消息、黑名单、已存在 sha、批内重复都被丢", () => {
  const commits = [
    commit({ sha: "keep1", message: "实现档案看板的取数口径" }),
    commit({ sha: "merge1", message: "Merge pull request #1 from x/y" }),
    commit({ sha: "short1", message: "fix" }),
    commit({ sha: "blank1", message: "update" }),
    commit({ sha: "dup-db", message: "库里已经同步过的提交内容" }),
    commit({ sha: "keep1", message: "实现档案看板的取数口径" }), // 批内重复
    commit({ sha: "keep2", message: "补充发布动作的敏感信息扫描门" }),
  ];

  const kept = filterCommits(commits, new Set(["dup-db"]));

  assert.deepEqual(kept.map((c) => c.sha), ["keep1", "keep2"]);
});

test("filterCommits：恰好 10 字符留下，9 字符丢", () => {
  const nine = commit({ sha: "s9", message: "123456789" });
  const ten = commit({ sha: "s10", message: "1234567890" });

  assert.deepEqual(filterCommits([nine, ten], new Set()).map((c) => c.sha), ["s10"]);
});

test("sanitizeRepoSlug：大小写/下划线/点转连字符，去首尾，空串回落", () => {
  assert.equal(sanitizeRepoSlug("My_Repo.name"), "my-repo-name");
  assert.equal(sanitizeRepoSlug("--Hello--World--"), "hello-world");
  assert.equal(sanitizeRepoSlug("___"), "repo");
  assert.equal(sanitizeRepoSlug("a"), "a");
});

test("buildDraftSlug：形态合法、含日期、超长截断后仍匹配 SLUG_PATTERN", () => {
  const normal = buildDraftSlug("laity9527/Laity-Archive", "2026-11-10T08:00:00Z");
  assert.equal(normal, "gh-laity-archive-20261110");
  assert.ok(SLUG_PATTERN.test(normal));

  const long = buildDraftSlug("x/" + "a".repeat(200), "2026-01-09T00:00:00Z");
  assert.ok(long.length <= 64, `超长未截断：${long.length}`);
  assert.ok(long.endsWith("-20260109"), `日期后缀被截掉了：${long}`);
  assert.ok(SLUG_PATTERN.test(long), `截断后形态非法：${long}`);
});

test("groupByRepoDay：同仓库同日合并、跨日/跨仓库分开、组内升序", () => {
  const commits = [
    commit({ sha: "b", repo: "o/r", date: "2026-11-10T12:00:00Z" }),
    commit({ sha: "a", repo: "o/r", date: "2026-11-10T08:00:00Z" }),
    commit({ sha: "c", repo: "o/r", date: "2026-11-11T08:00:00Z" }),
    commit({ sha: "d", repo: "o/other", date: "2026-11-10T09:00:00Z" }),
  ];

  const groups = groupByRepoDay(commits);

  assert.equal(groups.length, 3);
  // 第一组是 o/r 的 11-10，组内按时间升序 a 在前
  assert.deepEqual(groups[0].map((c) => c.sha), ["a", "b"]);
});

test("buildDraft 单条：标题取首行、BEFORE/AFTER 占位、双时间戳与 sha 锚点", () => {
  const draft = buildDraft([commit({ sha: "solo", message: "实现档案看板\n细节正文", date: "2026-11-10T08:00:00Z" })]);

  assert.equal(draft.title, "实现档案看板");
  assert.equal(draft.beforeContent, "（等待补充）");
  assert.equal(draft.afterContent, "（等待补充）");
  assert.equal(draft.sourceCommitSha, "solo");
  assert.equal(draft.slug, "gh-laity-archive-20261110");
  assert.deepEqual(draft.tags, ["github-sync", "laity-archive"]);
  assert.equal(draft.beforeDate.toISOString(), "2026-11-10T08:00:00.000Z");
  assert.equal(draft.afterDate.toISOString(), "2026-11-10T08:00:00.000Z");
});

test("buildDraft 合并：标题带条数、AFTER 列首行清单、时间戳取首末", () => {
  const group = [
    commit({ sha: "first", message: "上午的第一条改动", date: "2026-11-10T08:00:00Z" }),
    commit({ sha: "second", message: "下午的第二条改动", date: "2026-11-10T15:00:00Z" }),
  ];

  const draft = buildDraft(group);

  assert.equal(draft.title, "laity-archive · 11月10日 · 2 条提交");
  assert.equal(draft.afterContent, "- 上午的第一条改动\n- 下午的第二条改动");
  assert.equal(draft.sourceCommitSha, "first");
  assert.equal(draft.beforeDate.toISOString(), "2026-11-10T08:00:00.000Z");
  assert.equal(draft.afterDate.toISOString(), "2026-11-10T15:00:00.000Z");
});

test("buildDraft：标题超 120 字截断、tag 超 24 字截断", () => {
  const longMessage = "长".repeat(200);
  const draft = buildDraft([commit({ message: longMessage, repo: "o/" + "r".repeat(60) })]);

  assert.ok(draft.title.length <= 120, `标题未截断：${draft.title.length}`);
  assert.ok(draft.tags[1].length <= 24, `tag 未截断：${draft.tags[1].length}`);
});