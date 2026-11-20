/**
 * 文件：tests/git-anchor.test.ts
 * 描述：Git 锚定网络层回归：存证路径/标签格式、规范化 md 组装、Contents/Refs 两段调用，
 *       以及接口非 2xx 与网络抛错的降级行为（不向上抛，发布不因此失败）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 任务 8：Git 锚定失败降级场景测试；fetch 用桩注入，不发真实请求）
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anchorGitEvidenceWithToken,
  buildCanonicalMd,
  evidenceFilePath,
  evidenceTagRef,
  runGitAnchorQuietlyWithToken,
  type GitAnchorInput,
} from "../src/lib/git-anchor.ts";

const input: GitAnchorInput = {
  userId: "user_1",
  trace: {
    slug: "build-index-prebuild",
    title: "构建期预生成索引",
    beforeContent: "构建耗时从 3.2s 涨到 11.8s。\r\n行尾有空白   ",
    afterContent: "首次打开 1.1s。",
    contentHash: "a0197426d22d51d17a07c7e7546fd548cce8cde5b180870ba5b8e4af5dcca2f5",
    publishedAt: new Date("2026-11-18T08:00:00.000Z"),
  },
  version: 3,
};

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    calls.push({ url: urlStr, init: init ?? {} });
    return handler(urlStr, init ?? {});
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

test("存证文件路径：traces/<slug>/v<N>.md", () => {
  assert.equal(evidenceFilePath("build-index-prebuild", 3), "traces/build-index-prebuild/v3.md");
});

test("存证路径与标签对 slug 逐段转义", () => {
  assert.equal(evidenceFilePath("a/b c", 2), "traces/a%2Fb%20c/v2.md");
  assert.equal(evidenceTagRef("a/b c", 2), "refs/tags/trace/a%2Fb%20c/v2");
});

test("规范化 md：元信息头 + 正文同 v2 规范化口径（CRLF→LF、行尾空白收敛）", () => {
  const md = buildCanonicalMd(input);
  assert.match(md, /^# 构建期预生成索引\n/);
  assert.match(md, /^- trace: build-index-prebuild$/m);
  assert.match(md, /^- version: 3$/m);
  assert.match(md, /^- contentHash: a0197426/m);
  assert.match(md, /^- publishedAt: 2026-11-18T08:00:00\.000Z$/m);
  assert.match(md, /## BEFORE\n\n构建耗时从 3\.2s 涨到 11\.8s。\n/);
  assert.ok(!md.includes("\r"));
  assert.ok(!md.includes("   "));
});

test("Contents API 非 2xx：降级返回原因，不抛错", async () => {
  const mock = mockFetch(() => new Response("boom", { status: 500 }));
  try {
    const result = await anchorGitEvidenceWithToken(input, "laity9527/laity-archive", "fake-token");
    assert.deepEqual(result, { ok: false, reason: "Contents API 返回 500" });
    assert.equal(mock.calls.length, 1);
    assert.match(mock.calls[0].url, /\/repos\/laity9527\/laity-archive\/contents\/traces\/build-index-prebuild\/v3\.md$/);
    assert.equal(mock.calls[0].init.method, "PUT");
  } finally {
    mock.restore();
  }
});

test("Contents API 响应缺 sha：降级返回原因", async () => {
  const mock = mockFetch(() => okResponse({ message: "ok" }));
  try {
    const result = await anchorGitEvidenceWithToken(input, "r/repo", "t");
    assert.deepEqual(result, { ok: false, reason: "Contents API 响应缺少 sha" });
  } finally {
    mock.restore();
  }
});

test("Refs API 非 2xx：降级返回原因，不抛错", async () => {
  const mock = mockFetch((url) =>
    url.endsWith("/git/refs") ? new Response("boom", { status: 422 }) : okResponse({ sha: "abc123def456" }),
  );
  try {
    const result = await anchorGitEvidenceWithToken(input, "r/repo", "t");
    assert.deepEqual(result, { ok: false, reason: "Refs API 返回 422" });
    assert.equal(mock.calls.length, 2);
    assert.match(mock.calls[1].url, /\/repos\/r\/repo\/git\/refs$/);
    assert.equal(mock.calls[1].init.method, "POST");
  } finally {
    mock.restore();
  }
});

test("两段都成功：回出 sha 与去前缀标签", async () => {
  const mock = mockFetch((url) =>
    url.includes("/contents/")
      ? okResponse({ content: { sha: "deadbeefcafebabe000000000000000000000000" } })
      : okResponse({ ok: true }),
  );
  try {
    const result = await anchorGitEvidenceWithToken(input, "r/repo", "t");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.sha, "deadbeefcafebabe000000000000000000000000");
      assert.equal(result.tag, "trace/build-index-prebuild/v3");
      assert.ok(result.syncedAt instanceof Date);
    }
  } finally {
    mock.restore();
  }
});

test("网络抛错：静默包装吞掉异常，不向上抛（发布降级路径）", async () => {
  const mock = mockFetch(() => {
    throw new Error("ECONNREFUSED");
  });
  try {
    await runGitAnchorQuietlyWithToken(input, "r/repo", "t");
  } finally {
    mock.restore();
  }
});
