/**
 * 文件：src/proxy.ts
 * 描述：请求前置校验：/u/:handle/logs/:slug 与 /u/:handle/projects/:slug 未命中记录直接返回 404；/admin 全路由校验登录态
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: matcher 扩展 /admin/:path*，加登录态与白名单校验（Phase 3）
 * - 2026-10-30: matcher 扩展 /projects/:slug，404 页文案按路由类型分别给出（Phase 5a，经我批准）
 * - 2026-10-30: 未登录改跳自建 /login?callbackUrl=…，不再经 /api/auth/signin 多绕一次 307（I012-B）
 * - 2026-11-04: 白名单校验改为会话里的管理员标记，不再 import src/auth（口令比较用 node:crypto，不该被拉进前置守卫）
 * - 2026-11-05: 404 内联页背景随 D30 由 #FBFBF9 改为 #f4f1ec（只改色值，前置守卫逻辑与 matcher 一字未动）
 * - 2026-11-05: D30 A1 主墨色 #131313 → #1a1a18，共三处（body 文字、链接文字、a:hover 下边框）；
 *               同一段里的 #5C5C5C 属 A2、#E7E7E2 属 A3，本轮**故意不改**，免得回退值与令牌值不一致
 * - 2026-11-05: D30 A2 辅助灰 #5C5C5C → #625d53，两处（`.label`、`p`）；#E7E7E2 属 A3，仍未动；
 *               内联样式自成一套、拿不到 CSS 变量，故这里保持字面量与令牌同值（改令牌必须同步改这里）
 * - 2026-11-05: D30 A3 分隔线 #E7E7E2 → #d9d2c5（一处：`a` 的下边框），与 globals.css 的 `--color-hairline` 同批落，避免 404 页与全站不同色（I073 豁免 3:1，实算只作留档）
 * - 2026-11-06: 第四批去英文（负责人裁断二）：404 内联页的 `404 · NOT FOUND` 改为 `404 · 页面未找到`；
 *               只改这一行文案，前置守卫逻辑、matcher 与四组色值字面量一字未动
 * - 2026-11-09: V2.0 Step 3 阶段二：matcher 改 /u/:handle/logs/:slug 与 /u/:handle/projects/:slug（阶段一
 *               已把详情路由迁进租户前缀）；从 URL 提取 handle 与 slug 传入 isPublishedLogSlug/isProjectSlug 做
 *               双层判定——层一 handle 在库里存在（lib 内 resolveUserId 不过即 false），层二 slug 命中且已发布；
 *               未知 handle 与缺日志/项目都回同一页 404，文案不泄露缺的是哪一层
 * - 2026-11-09: V2.0 Step 4-B：guardAdmin 判据由 token.isAdmin 改 token.userId 非空字符串——
 *               多租户下每个注册用户都是自己的管理员，isAdmin 布尔位随口令登录退役（数据隔离在数据层做）
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isPublishedLogSlug } from "@/lib/logs";
import { isProjectSlug } from "@/lib/projects";

export const config = {
  matcher: ["/u/:handle/logs/:slug", "/u/:handle/projects/:slug", "/admin/:path*"],
};

// 文案全部是常量，请求里的 slug 不会拼进 HTML
const NOT_FOUND_COPY = {
  log: {
    title: "404 · 日志不存在",
    heading: "这条日志不存在",
    hint: "它可能还没有发布，或者链接已经失效。",
    backHref: "/logs",
    backText: "← 返回日志列表",
  },
  project: {
    title: "404 · 项目不存在",
    heading: "这个项目不存在",
    hint: "链接可能失效了，也可能这个项目还没有进档案库。",
    backHref: "/projects",
    backText: "← 返回项目列表",
  },
};

type NotFoundKind = keyof typeof NOT_FOUND_COPY;

function notFoundHtml(kind: NotFoundKind) {
  const copy = NOT_FOUND_COPY[kind];

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${copy.title}</title>
<style>
html,body{margin:0;padding:0;background:#f4f1ec;color:#1a1a18}
body{font-family:-apple-system,"Segoe UI","Noto Sans SC",sans-serif}
main{max-width:720px;margin:0 auto;padding:112px 24px}
.label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em;color:#625d53}
h1{margin:24px 0 0;font-size:30px;font-weight:500;letter-spacing:-0.01em}
p{margin:16px 0 0;font-size:16px;line-height:1.85;color:#625d53}
a{display:inline-block;margin-top:48px;padding-bottom:2px;border-bottom:1px solid #d9d2c5;color:#1a1a18;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em}
a:hover{border-bottom-color:#1a1a18}
</style>
</head>
<body>
<main>
<p class="label">404 · 页面未找到</p>
<h1>${copy.heading}</h1>
<p>${copy.hint}</p>
<a href="${copy.backHref}">${copy.backText}</a>
</main>
</body>
</html>`;
}

function notFoundResponse(kind: NotFoundKind) {
  return new NextResponse(notFoundHtml(kind), {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
      // 记录发布后同一个 URL 必须能立刻返回 200，不能让 CDN 缓存住这一次 404
      "cache-control": "no-store",
    },
  });
}

// 从 /u/<handle>/<kind>/<slug> 提取 handle 与 slug；段可能带 URL 编码，decode 失败一律 null
function readTenantSegment(pathname: string, kind: "logs" | "projects") {
  if (!pathname.startsWith("/u/")) {
    return null;
  }

  const parts = pathname.slice(3).replace(/\/+$/, "").split("/");

  if (parts.length !== 3 || parts[1] !== kind) {
    return null;
  }

  const [handle, , slug] = parts;

  if (!handle || !slug) {
    return null;
  }

  try {
    return { handle: decodeURIComponent(handle), slug: decodeURIComponent(slug) };
  } catch {
    return null;
  }
}

async function guardAdmin(request: NextRequest) {
  const token = await getToken({ req: request });

  // 判据与 requireAdminSession 同源：会话里带非空 userId 才放行（isAdmin 已退役）
  if (typeof token?.userId !== "string" || token.userId.length === 0) {
    // 直接去自建登录页；再走 /api/auth/signin 会因为 pages.signIn 多一次 307
    const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return guardAdmin(request);
  }

  // 双层判定：层一 handle 在库里存在（lib 内 resolveUserId 查不到即 false），层二 slug 命中且已发布。
  // 未知 handle、缺日志、草稿三种情形都回同一页 404——文案只写"不存在/可能未发布/链接失效"，不泄露缺的是哪一层
  const logHit = readTenantSegment(pathname, "logs");

  if (logHit) {
    return (await isPublishedLogSlug(logHit.slug, logHit.handle))
      ? NextResponse.next()
      : notFoundResponse("log");
  }

  const projectHit = readTenantSegment(pathname, "projects");

  if (projectHit) {
    return (await isProjectSlug(projectHit.slug, projectHit.handle))
      ? NextResponse.next()
      : notFoundResponse("project");
  }

  // matcher 只放行上面两类租户动态路由与 /admin；走到这里说明 matcher 被改宽了，放行比误拦安全
  return NextResponse.next();
}
