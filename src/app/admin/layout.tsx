/**
 * 文件：src/app/admin/layout.tsx
 * 描述：后台外壳：登录校验（Proxy 之外的第二道）、地标与跳转链接、导航与退出入口
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: 第二道守卫的跳转目标改为自建 /login?callbackUrl=%2Fadmin（I012-B）
 * - 2026-11-02: 更正 instant 注释：false 是退出即时导航校验，不是把路由改成动态
 * - 2026-11-04: 会话判定换 requireAdminSession（与守卫层同一判据）；内容容器改成 main#main 并补"跳到正文"——
 *               后台此前没有地标，键盘用户要 Tab 过整条导航才碰到正文
 * - 2026-11-04: 退出从 <a href="/api/auth/signout"> 换成 SignOutButton：那张框架确认页是全站唯一的英文界面，
 *               样式也是 I012-B 当年替掉的默认卡片（源码 next-auth/core/pages/signout.js 里的 "Are you sure…"）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

// 后台读会话与数据库，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

export const metadata: Metadata = {
  title: "后台 · Laity 项目档案库",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-12">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:border focus:border-ink focus:bg-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        跳到正文
      </a>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
        <nav className="flex items-baseline gap-6">
          <Link
            href="/admin"
            className="font-mono text-[11px] tracking-[0.2em] text-ink"
          >
            后台
          </Link>
          <Link
            href="/admin/projects"
            className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
          >
            项目
          </Link>
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
          >
            ↗ 前台
          </Link>
        </nav>
        <div className="flex items-baseline gap-4 font-mono text-[11px] text-ink-soft">
          <span>{session.user?.name ?? "已登录"}</span>
          <SignOutButton />
        </div>
      </header>
      <main id="main" className="mt-10">{children}</main>
    </div>
  );
}
