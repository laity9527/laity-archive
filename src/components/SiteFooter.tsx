/**
 * 文件：src/components/SiteFooter.tsx
 * 描述：前台页脚：站点定位一句话、隐私说明入口与 ICP 备案号合规位；后台与登录页不渲染
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。备案号由根布局读环境变量后以 prop 传入，未配置时整行不渲染
 * - 2026-11-03: 补开源许可入口、侵权投诉邮箱位、公安备案号位与版权行；三个新位同样是"未设置就不渲染"
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/routes";

type SiteFooterProps = {
  icp: string | null;
  policeIcp: string | null;
  contactEmail: string | null;
};

export function SiteFooter({ icp, policeIcp, contactEmail }: SiteFooterProps) {
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
        <Link
          href="/licenses"
          className="border-b border-transparent hover:border-ink hover:text-ink"
        >
          开源许可
        </Link>
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent("侵权投诉/联系")}`}
            className="border-b border-transparent hover:border-ink hover:text-ink"
          >
            侵权投诉与联系
          </a>
        )}
        <span className="ml-auto flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {policeIcp && (
            <a
              href="https://beian.mps.gov.cn/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:text-ink"
            >
              {policeIcp}
            </a>
          )}
          {icp && (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:text-ink"
            >
              {icp}
            </a>
          )}
          <span>© 2026 LAITY</span>
        </span>
      </div>
    </footer>
  );
}
