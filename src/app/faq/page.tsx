/**
 * 文件：src/app/faq/page.tsx
 * 描述：前台问答页：RSC 渲染，只展示 enabled=true 且未软删的问答，按 sort 升序
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 4.3）。可见性口径由 DAL 的 SQL 过滤承担，页面只做渲染
 * - 2026-11-19: V5 Phase 3：页面渲染时自增 FAQ 访问计数（incrementFaqVisit，内存计数不落库）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/site/SectionHead";
import { listEnabledFaqs } from "@/lib/faq-admin";
import { incrementFaqVisit } from "@/lib/stats-admin";

export const metadata: Metadata = {
  title: "常见问题",
  description: "常见问题与解答。",
};

export const instant = false;

export default async function FaqPage() {
  await connection();
  incrementFaqVisit();
  const faqs = await listEnabledFaqs();

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <PageHeader
        eyebrow="FAQ"
        title="常见问题"
        lede="以下是常被问到的问题，按排序依次展开。"
      />

      {faqs.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          暂无已启用的问答。
        </p>
      ) : (
        <div className="mt-8 border-t border-ink">
          {faqs.map((faq) => (
            <details key={faq.id} className="border-b border-hairline py-4">
              <summary className="cursor-pointer font-sans text-sm text-ink">
                {faq.question}
              </summary>
              <p className="mt-2 font-serif text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
