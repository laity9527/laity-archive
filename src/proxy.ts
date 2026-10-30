/**
 * 文件：src/proxy.ts
 * 描述：请求前置校验：/logs/:slug 未命中已发布日志时直接返回 404 状态码（页面级 notFound 在 pPR 下只能返回 200）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublishedLogSlug } from "@/lib/logs";

export const config = { matcher: "/logs/:slug" };

const NOT_FOUND_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 · 日志不存在</title>
<style>
html,body{margin:0;padding:0;background:#FBFBF9;color:#131313}
body{font-family:-apple-system,"Segoe UI","Noto Sans SC",sans-serif}
main{max-width:720px;margin:0 auto;padding:112px 24px}
.label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em;color:#5C5C5C}
h1{margin:24px 0 0;font-size:30px;font-weight:500;letter-spacing:-0.01em}
p{margin:16px 0 0;font-size:16px;line-height:1.85;color:#5C5C5C}
a{display:inline-block;margin-top:48px;padding-bottom:2px;border-bottom:1px solid #E7E7E2;color:#131313;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.2em}
a:hover{border-bottom-color:#131313}
</style>
</head>
<body>
<main>
<p class="label">404 · NOT FOUND</p>
<h1>这条日志不存在</h1>
<p>它可能还没有发布，或者链接已经失效。</p>
<a href="/logs">← 返回日志列表</a>
</main>
</body>
</html>`;

function notFoundResponse() {
  return new NextResponse(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
      // 日志发布后同一个 URL 必须能立刻返回 200，不能让 CDN 缓存住这一次 404
      "cache-control": "no-store",
    },
  });
}

function readSlug(pathname: string) {
  const segment = pathname.slice("/logs/".length).replace(/\/+$/, "");

  if (!segment) {
    return null;
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const slug = readSlug(request.nextUrl.pathname);

  if (slug && (await isPublishedLogSlug(slug))) {
    return NextResponse.next();
  }

  return notFoundResponse();
}
