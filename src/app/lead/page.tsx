/**
 * 文件：src/app/lead/page.tsx
 * 描述：线索提交公开页：表单 + 说明，不暴露后台入口；提交成功只回通用回执
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.2）。独立公开页（方案 5.2 的 /contact 同源口径，
 *               本阶段按任务清单落地 /lead）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/SectionHead";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "合作线索",
  description: "提交合作或咨询线索，留下联系方式与需求，我会尽快回复。",
};

export const instant = false;

export default async function LeadPage() {
  await connection();

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <PageHeader
        eyebrow="LEAD"
        title="合作线索"
        lede="想聊聊项目合作、需求咨询或媒体采访，把联系方式与需求留在这里。提交后我会尽快回复。"
      />

      <LeadForm />

      <div className="mt-10 border-t border-hairline pt-6 font-sans text-xs leading-relaxed text-ink-soft">
        <p>
          提交的信息只用于回复这条线索；同一地址 5 分钟内只能提交一次，防止刷单。
        </p>
      </div>
    </main>
  );
}
