/**
 * 文件：src/components/SiteNav.tsx
 * 描述：前台站点导航：品牌字标（=首页）+ 作品档案/开发日志/关于三入口，当前页用 aria-current 标记；后台与登录页不渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。此前前台没有任何持久导航，/projects 只能手输 URL（I030 的根因）
 * - 2026-11-03: 前台/非前台判定改用 src/lib/routes.ts 的 isPublicRoute，与页脚共用一套规则
 * - 2026-11-05: 按 SPEC F19 与 DESIGN D31 新增「关于」入口（导航三项）；activeKey 用按段边界匹配，
 *               与 I060/I013 那条"裸 startsWith 会误判"的教训同口径；logs/projects 两行未动
 * - 2026-11-05: D30 B1 当前项由主墨改为唯一强调色 --brown（`border-brown text-brown`）；非当前项的辅助灰与 aria-current 逻辑均未动
 * - 2026-11-05: D30 B1 补——字标在首页时下边框走 `border-brown`、文字保持 `text-ink`，非首页为 `border-transparent`；"当前态 = 棕色下划线"从此无例外
 * - 2026-11-06: SECTIONS 顺序按负责人要求调整为「作品档案 → 开发日志 → 关于」（档案优先于复盘）；activeKey 判定与 aria-current、棕色当前态均未动
 * - 2026-11-06: 铁律合规修复（负责人裁断一）——三个中文导航项去 `font-mono` 与 `tracking-[0.2em]` 改走 `font-sans`；字标 LAITY 是英文品牌标识，仍留 `font-mono tracking-[0.3em]`
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";

// 首页由左侧字标承担，导航里不再放第二个指向 / 的链接（同页两个同链接是多余的）
const SECTIONS = [
  { key: "projects", href: "/projects", label: "作品档案" },
  { key: "logs", href: "/logs", label: "开发日志" },
  { key: "about", href: "/about", label: "关于" },
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
          : pathname === "/about" || pathname.startsWith("/about/")
            ? "about"
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
          className={`border-b font-mono text-[11px] tracking-[0.3em] text-ink ${
            activeKey === "home" ? "border-brown" : "border-transparent"
          }`}
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
              className={`border-b pb-1 font-sans text-[10px] ${
                activeKey === section.key
                  ? "border-brown text-brown"
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
