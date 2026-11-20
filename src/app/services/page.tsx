/**
 * 文件：src/app/services/page.tsx
 * 描述：前台服务介绍页：RSC 渲染，只展示 enabled=true 且未软删的服务，按 sort 升序
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 3.3）。可见性口径由 DAL 的 SQL 过滤承担，
 *               页面只做渲染，不自行过滤
 * - 2026-11-19: V5 Phase 3：页面渲染时自增服务访问计数（incrementServiceVisit，内存计数不落库）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/site/SectionHead";
import { listEnabledServices } from "@/lib/service-admin";
import { incrementServiceVisit } from "@/lib/stats-admin";

export const metadata: Metadata = {
  title: "服务",
  description: "提供的服务与交付方式。",
};

export const instant = false;

export default async function ServicesPage() {
  await connection();
  incrementServiceVisit();
  const services = await listEnabledServices();

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <PageHeader
        eyebrow="SERVICES"
        title="服务"
        lede="以下是当前提供的服务，按交付顺序排列。"
      />

      {services.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          暂无已启用的服务。
        </p>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {services.map((service, index) => (
            <li key={service.id} className="border-b border-hairline py-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-ink-soft">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="text-xl font-medium tracking-tight text-ink">{service.title}</h2>
              </div>
              {service.summary && (
                <p className="mt-2 font-sans text-sm text-ink-soft">{service.summary}</p>
              )}
              {service.body && (
                <p className="mt-3 font-serif text-sm leading-relaxed text-ink whitespace-pre-wrap">
                  {service.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
