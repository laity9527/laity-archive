/**
 * 文件：src/components/AdminNav.tsx
 * 描述：后台侧栏：深墨底分组导航（轨迹管理 / 主题 / 线索 / 媒体库 / 服务 / FAQ / 系统），
 *       桌面竖排带组标题、移动端横滚；当前项用棕色边线标记；权限统一走管理员鉴权
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（Phase C）。后台此前只有一条 11px 的横排导航，没有侧栏，
 *               与前台共用纸白底，空间感不分。当前项用 usePathname 判定，aria-current 同步；
 *               退出按钮走 SignOutButton 的 dark 变体
 * - 2026-11-19: V5 Phase 2 任务 5：导航改分组结构——新增主题/线索/媒体库/服务/FAQ 五组入口，
 *               系统组收纳设置与审计；不存在普通用户角色，全部后台路由保持管理员单一鉴权
 * - 2026-11-19: V5 Phase 3 任务 3：新增「统计」组（/admin/stats 占位页），页面主体延后 Phase4
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/admin/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：组标题 text-paper/40 → text-paper/60——40% 纸白在深墨底上
 *               实算约 3.5:1，不达正文 4.5:1；60% 约 6.3:1 达标（同一令牌族，不引入新色值）
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";

const GROUPS = [
  {
    label: "轨迹管理",
    items: [
      { href: "/admin", label: "概览", exact: true },
      { href: "/admin/logs", label: "日志", exact: false },
      { href: "/admin/projects", label: "项目", exact: false },
      { href: "/admin/series", label: "系列", exact: false },
    ],
  },
  {
    label: "主题",
    items: [{ href: "/admin/topics", label: "主题", exact: false }],
  },
  {
    label: "线索",
    items: [{ href: "/admin/leads", label: "线索", exact: false }],
  },
  {
    label: "媒体库",
    items: [{ href: "/admin/media", label: "媒体库", exact: false }],
  },
  {
    label: "服务",
    items: [{ href: "/admin/services", label: "服务", exact: false }],
  },
  {
    label: "FAQ",
    items: [{ href: "/admin/faqs", label: "FAQ", exact: false }],
  },
  {
    label: "统计",
    items: [{ href: "/admin/stats", label: "统计", exact: false }],
  },
  {
    label: "系统",
    items: [
      { href: "/admin/settings", label: "设置", exact: false },
      { href: "/admin/audit", label: "审计", exact: false },
    ],
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 border-b-2 px-3 py-2 text-xs md:border-b-0 md:border-l-2 md:px-5 md:py-2.5 ${
        active
          ? "border-brown bg-paper/5 text-paper"
          : "border-transparent text-paper/60 hover:text-paper"
      }`}
    >
      {label}
    </Link>
  );
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
        {/* 移动端：横滚平铺，不带组标题；桌面端：分组竖排，每组带标题 */}
        {GROUPS.map((group) => (
          <div key={group.label} className="contents md:block">
            <p className="hidden font-mono text-[9px] tracking-[0.25em] text-paper/60 md:mt-5 md:px-5 md:pb-1">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href, item.exact)}
              />
            ))}
          </div>
        ))}
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
