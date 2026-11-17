import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractLogLinkSlugs,
  MAX_LOG_LINKS,
  rehypeLogLinks,
  splitLogLinkText,
  type LogLinkHastNode,
} from "../src/lib/log-links.ts";

test("切分：无占位时原样返回一段文本", () => {
  assert.deepEqual(splitLogLinkText("普通正文，没有内链。"), [
    { type: "text", value: "普通正文，没有内链。" },
  ]);
});

test("切分：开头、中间、结尾的占位都能切开且不产生空文本段", () => {
  assert.deepEqual(splitLogLinkText("[[a]] 中间 [[b-c]] 结尾"), [
    { type: "link", value: "[[a]]", slug: "a" },
    { type: "text", value: " 中间 " },
    { type: "link", value: "[[b-c]]", slug: "b-c" },
    { type: "text", value: " 结尾" },
  ]);
});

test("切分：不合 slug 口径的写法不当内链（大写、下划线、空格、空 slug）", () => {
  const raw = "[[Bad]] [[a_b]] [[a b]] [[]] [[a--b]]";

  assert.deepEqual(splitLogLinkText(raw), [{ type: "text", value: raw }]);
});

test("抽 slug：跨 before / after 保持出现顺序并去重，null 入参跳过", () => {
  assert.deepEqual(
    extractLogLinkSlugs("见 [[a]] 与 [[b]]", null, "又见 [[a]]、[[c]]", undefined),
    ["a", "b", "c"],
  );
});

test("抽 slug：超过上限即停，不把整篇的引用都带出去", () => {
  const many = Array.from({ length: MAX_LOG_LINKS + 5 }, (_, i) => `[[s-${i}]]`).join(" ");
  const slugs = extractLogLinkSlugs(many);

  assert.equal(slugs.length, MAX_LOG_LINKS);
  assert.equal(slugs[0], "s-0");
  assert.equal(slugs.at(-1), `s-${MAX_LOG_LINKS - 1}`);
});

function rewrite(value: string, links: Record<string, string>) {
  const tree: LogLinkHastNode = {
    type: "root",
    children: [{ type: "element", tagName: "p", children: [{ type: "text", value }] }],
  };

  rehypeLogLinks({ links, href: (slug) => `/u/me/logs/${slug}` })(tree);

  return tree.children?.[0].children ?? [];
}

test("渲染：命中目标时换成链接，显示目标标题而不是 slug", () => {
  const children = rewrite("先读 [[d30]]。", { d30: "D30 四步切换" });

  assert.deepEqual(children, [
    { type: "text", value: "先读 " },
    {
      type: "element",
      tagName: "a",
      properties: { href: "/u/me/logs/d30" },
      children: [{ type: "text", value: "D30 四步切换" }],
    },
    { type: "text", value: "。" },
  ]);
});

test("渲染：未命中的占位保留原文，不生成死链", () => {
  assert.deepEqual(rewrite("见 [[draft-only]]", {}), [
    { type: "text", value: "见 [[draft-only]]" },
  ]);
});

test("渲染：代码块与既有链接内部不接管", () => {
  const tree: LogLinkHastNode = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        children: [
          { type: "element", tagName: "code", children: [{ type: "text", value: "[[a]]" }] },
        ],
      },
      {
        type: "element",
        tagName: "a",
        properties: { href: "/somewhere" },
        children: [{ type: "text", value: "[[a]]" }],
      },
    ],
  };

  rehypeLogLinks({ links: { a: "标题" }, href: (slug) => `/u/me/logs/${slug}` })(tree);

  assert.deepEqual(tree.children?.[0].children?.[0].children?.[0], {
    type: "text",
    value: "[[a]]",
  });
  assert.deepEqual(tree.children?.[1].children?.[0], {
    type: "text",
    value: "[[a]]",
  });
});
