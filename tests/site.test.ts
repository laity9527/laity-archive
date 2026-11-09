/**
 * 文件：tests/site.test.ts
 * 描述：站点标识与路由归属判定的回归测试：URL 归一化、备案号缺省、导航/页脚在哪些路径渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 * - 2026-11-04: 站点 URL 与备案号用例改为自行设定并复原环境变量——原先假设"未配置"，
 *               CI 的作业级 env 设了 NEXTAUTH_URL 就直接红；同时补上已配置分支与尾斜杠归一化的覆盖
 * - 2026-11-09: V2.0 Step 3：公开路由示例随 /u/[handle] 体系更新——/logs/some-slug 改
 *               /u/some-handle/logs/some-slug，并补 /u/some-handle（租户主页）与 /u/some-handle/projects/some-slug
 *               两个正例；分类逻辑（/admin、/login 前缀制）未动，仅示例路径跟随现行路由
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { siteIcp, siteName, siteUrl } from "../src/lib/site.ts";
import { isPublicRoute } from "../src/lib/routes.ts";

// 用例外层保存原值、结束后复原：被测函数读的是 process.env，
// 不让用例之间、也不让本机与 CI 之间的环境差异影响结论
function withEnv<T>(name: string, value: string | undefined, run: () => T): T {
  const before = process.env[name];

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    return run();
  } finally {
    if (before === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = before;
    }
  }
}

test("未配置 NEXTAUTH_URL 时回落到本地开发地址", () => {
  const result = withEnv("NEXTAUTH_URL", undefined, siteUrl);

  assert.equal(result, "http://localhost:3000");
});

test("已配置时按配置值返回，并去掉结尾多余斜杠", () => {
  assert.equal(withEnv("NEXTAUTH_URL", "https://laity.cn", siteUrl), "https://laity.cn");
  assert.equal(withEnv("NEXTAUTH_URL", "https://laity.cn/", siteUrl), "https://laity.cn");
  assert.equal(withEnv("NEXTAUTH_URL", "  https://laity.cn///  ", siteUrl), "https://laity.cn");
});

test("空串或纯空白的 NEXTAUTH_URL 视同未配置", () => {
  assert.equal(withEnv("NEXTAUTH_URL", "", siteUrl), "http://localhost:3000");
  assert.equal(withEnv("NEXTAUTH_URL", "   ", siteUrl), "http://localhost:3000");
});

test("备案号未配置时返回 null（页脚据此不渲染该行）", () => {
  assert.equal(withEnv("SITE_ICP", undefined, siteIcp), null);
  assert.equal(withEnv("SITE_ICP", "", siteIcp), null);
  assert.equal(withEnv("SITE_ICP", "   ", siteIcp), null);
  assert.equal(withEnv("SITE_ICP", " 京ICP备12345678号-1 ", siteIcp), "京ICP备12345678号-1");
});

test("站点名非空", () => {
  assert.ok(siteName.length > 0);
});

test("后台与登录页不算前台路径", () => {
  assert.equal(isPublicRoute("/admin"), false);
  assert.equal(isPublicRoute("/admin/logs/new"), false);
  assert.equal(isPublicRoute("/admin/projects"), false);
  assert.equal(isPublicRoute("/login"), false);
  assert.equal(isPublicRoute("/login?error=CredentialsSignin"), false);
});

test("前台路径与首页都算公开，空串防御性返回 false", () => {
  assert.equal(isPublicRoute("/"), true);
  assert.equal(isPublicRoute("/logs"), true);
  assert.equal(isPublicRoute("/u/some-handle"), true);
  assert.equal(isPublicRoute("/u/some-handle/logs/some-slug"), true);
  assert.equal(isPublicRoute("/u/some-handle/projects/some-slug"), true);
  assert.equal(isPublicRoute("/projects"), true);
  assert.equal(isPublicRoute("/privacy"), true);
  assert.equal(isPublicRoute(""), false);
});

test("相邻前缀不能被误判（/administrative 不是后台）", () => {
  assert.equal(isPublicRoute("/administrative"), true);
  assert.equal(isPublicRoute("/logstash"), true);
});
