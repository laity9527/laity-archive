/**
 * 文件：tests/site.test.ts
 * 描述：站点标识与路由归属判定的回归测试：URL 归一化、备案号缺省、导航/页脚在哪些路径渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { siteIcp, siteName, siteUrl } from "../src/lib/site.ts";
import { isPublicRoute } from "../src/lib/routes.ts";

// node --test 不会加载 .env（那是 Next 启动时做的事），所以这里断言的就是"未配置"分支
test("未配置 NEXTAUTH_URL 时回落到本地开发地址，且不带尾斜杠", () => {
  assert.equal(process.env.NEXTAUTH_URL, undefined);
  assert.equal(siteUrl(), "http://localhost:3000");
});

test("未配置 SITE_ICP 时页脚拿不到备案号（而不是渲染空串或 undefined）", () => {
  assert.equal(siteIcp(), null);
});

test("站点名非空", () => {
  assert.ok(siteName.length > 0);
});

test("后台与登录页不算前台路径", () => {
  assert.equal(isPublicRoute("/admin"), false);
  assert.equal(isPublicRoute("/admin/logs/new"), false);
  assert.equal(isPublicRoute("/admin/projects"), false);
  assert.equal(isPublicRoute("/login"), false);
  assert.equal(isPublicRoute("/login?error=AccessDenied"), false);
});

test("前台路径与首页都算公开，空串防御性返回 false", () => {
  assert.equal(isPublicRoute("/"), true);
  assert.equal(isPublicRoute("/logs"), true);
  assert.equal(isPublicRoute("/logs/some-slug"), true);
  assert.equal(isPublicRoute("/projects"), true);
  assert.equal(isPublicRoute("/privacy"), true);
  assert.equal(isPublicRoute(""), false);
});

test("相邻前缀不能被误判（/administrative 不是后台）", () => {
  assert.equal(isPublicRoute("/administrative"), true);
  assert.equal(isPublicRoute("/logstash"), true);
});
