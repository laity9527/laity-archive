/**
 * 文件：src/components/SiteFooter.tsx
 * 描述：前台页脚：站点定位一句话、隐私说明入口与 ICP 备案号合规位；后台与登录页不渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。备案号由根布局读环境变量后以 prop 传入，未配置时整行不渲染
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";

type SiteFooterProps = {
  icp: string | null;
};

export function SiteFooter({ icp }: SiteFooterProps) {
  const pathname = usePathname();

  if (!isPublicRoute(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-baseline gap-x-8 gap-y-3 px-6 py-8 font-mono text-[10px] tracking-[0.2em] text-ink-soft">
        <span className="text-ink">LAITY</span>
        <Link
          href="/privacy"
          className="border-b border-transparent hover:border-ink hover:text-ink"
        >
          隐私与数据说明
        </Link>
        {icp && (
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ml-auto hover:text-ink"
          >
            {icp}
          </a>
        )}
      </div>
    </footer>
  );
}
