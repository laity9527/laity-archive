/**
 * 文件：src/app/admin/layout.tsx
 * 描述：后台外壳：登录校验（Proxy 之外的第二道）、导航与退出入口
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// 后台读会话与数据库，整体阻塞渲染，不进静态壳
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
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin/github?callbackUrl=/admin");
  }

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-12">
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
          {/* NextAuth v4 的退出是 API 路由返回的确认页，不是 app 页面，Link 预取拿不到 RSC */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/auth/signout" className="border-b border-ink text-ink">
            退出
          </a>
        </div>
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}
