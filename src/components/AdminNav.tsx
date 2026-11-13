/**
 * 文件：src/components/AdminNav.tsx
 * 描述：后台侧栏：深墨底、概览 / 日志 / 项目三段导航，桌面竖排、移动端横滚；当前项用棕色边线标记
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（Phase C）。后台此前只有一条 11px 的横排导航，没有侧栏，
 *               与前台共用纸白底，空间感不分。当前项用 usePathname 判定，aria-current 同步；
 *               退出按钮走 SignOutButton 的 dark 变体
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

const ITEMS = [
  { href: "/admin", label: "概览", exact: true },
  { href: "/admin/logs", label: "日志", exact: false },
  { href: "/admin/projects", label: "项目", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="bg-ink text-paper md:sticky md:top-0 md:flex md:h-screen md:w-[200px] md:shrink-0 md:flex-col">
      <div className="flex items-center justify-between gap-4 px-5 py-4 md:block md:py-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-paper/60">
            LAITY
          </p>
          <p className="mt-1 text-sm font-medium">后台</p>
        </div>
        <div className="md:hidden">
          <SignOutButton tone="dark" />
        </div>
      </div>

      <nav
        aria-label="后台导航"
        className="flex gap-1 overflow-x-auto px-2 pb-2 md:mt-2 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0"
      >
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-xs md:border-b-0 md:border-l-2 md:px-5 md:py-2.5 ${
                active
                  ? "border-brown bg-paper/5 text-paper"
                  : "border-transparent text-paper/60 hover:text-paper"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-xs text-paper/60 hover:text-paper md:mt-4 md:border-b-0 md:border-l-2 md:px-5 md:py-2.5"
        >
          ↗ 前台
        </Link>
      </nav>

      <div className="hidden border-t border-paper/15 px-5 py-4 md:mt-auto md:block">
        <p className="truncate font-sans text-[11px] text-paper/60">
          {userName}
        </p>
        <div className="mt-2">
          <SignOutButton tone="dark" />
        </div>
      </div>
    </aside>
  );
}
