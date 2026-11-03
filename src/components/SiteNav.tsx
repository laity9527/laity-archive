/**
 * 文件：src/components/SiteNav.tsx
 * 描述：前台站点导航：品牌字标 + 首页/开发日志/作品档案三入口，当前页用 aria-current 标记；后台与登录页不渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。此前前台没有任何持久导航，/projects 只能手输 URL（I030 的根因）
 * - 2026-11-03: 前台/非前台判定改用 src/lib/routes.ts 的 isPublicRoute，与页脚共用一套规则
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";

// 首页由左侧字标承担，导航里不再放第二个指向 / 的链接（同页两个同链接是多余的）
const SECTIONS = [
  { key: "logs", href: "/logs", label: "开发日志" },
  { key: "projects", href: "/projects", label: "作品档案" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  if (!isPublicRoute(pathname)) {
    return null;
  }

  const activeKey =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/logs")
        ? "logs"
        : pathname.startsWith("/projects")
          ? "projects"
          : null;

  return (
    <header className="border-b border-hairline">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:border focus:border-ink focus:bg-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        跳到正文
      </a>
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-baseline gap-x-8 gap-y-2 px-6 py-5">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.3em] text-ink"
          aria-current={activeKey === "home" ? "page" : undefined}
        >
          LAITY
        </Link>
        <nav aria-label="站点导航" className="ml-auto flex items-baseline gap-6">
          {SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              aria-current={activeKey === section.key ? "page" : undefined}
              className={`border-b pb-1 font-mono text-[10px] tracking-[0.2em] ${
                activeKey === section.key
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
