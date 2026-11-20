import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveImportMeta,
  slugFromFileName,
} from "../src/lib/markdown-import.ts";

test("文件名推 slug：小写化、非字母数字折叠、去首尾连字符", () => {
  assert.equal(slugFromFileName("2026-11-16 My Trace.md"), "2026-11-16-my-trace");
  assert.equal(slugFromFileName("a__b---c.markdown"), "a-b-c");
  assert.equal(slugFromFileName("C:\\docs\\Notes Final.md"), "notes-final");
});

test("文件名推 slug：中文名不生成乱码，返回空串由作者补填", () => {
  assert.equal(slugFromFileName("开发日志-第一篇.md"), "");
  assert.equal(slugFromFileName("日志.md"), "");
});

test("文首 H1 作为标题，并从正文移除该行", () => {
  const meta = deriveImportMeta("session-notes.md", "# 会话与票据\n\n正文第一段\n");

  assert.equal(meta.title, "会话与票据");
  assert.equal(meta.slug, "session-notes");
  assert.equal(meta.body, "正文第一段\n");
});

test("没有 H1 时标题留空、正文原样保留（含前导空行清理）", () => {
  const meta = deriveImportMeta("draft.md", "\n\n只是一段正文，无标题。");

  assert.equal(meta.title, "");
  assert.equal(meta.body, "只是一段正文，无标题。");
});

test("CRLF 归一成 LF；H1 前有空行也能识别", () => {
  const meta = deriveImportMeta("crlf.md", "\r\n\r\n#  带空格的标题  \r\n\r\n正文\r\n");

  assert.equal(meta.title, "带空格的标题");
  assert.equal(meta.body, "正文\n");
});

test("非 H1 的星号标题不当作标题", () => {
  const meta = deriveImportMeta("star.md", "**加粗开头**\n\n正文");

  assert.equal(meta.title, "");
  assert.equal(meta.body, "**加粗开头**\n\n正文");
});
