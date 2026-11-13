/**
 * 文件：tests/routes.test.ts
 * 描述：公开项目链接拼法的回归测试：必须落 /u/[handle]/projects/[slug]，且 handle/slug 会被编码
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。起因是首页看板仍拼 /projects/[slug]，线上实测 404；
 *               把口径收成 publicProjectHref() 后，用用例锁住路径形状
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { publicProjectHref } from "../src/lib/routes.ts";

test("公开项目链接落在 /u/[handle]/projects/[slug]", () => {
  assert.equal(
    publicProjectHref("zhanglei", "laity-archive"),
    "/u/zhanglei/projects/laity-archive",
  );
});

test("handle 与 slug 会被编码，不把斜杠带进路径段", () => {
  assert.equal(
    publicProjectHref("a/b", "c d"),
    "/u/a%2Fb/projects/c%20d",
  );
});
