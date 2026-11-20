/**
 * 文件：src/app/verify/page.tsx
 * 描述：核验入口页：粘贴内容摘要（64 位小写十六进制 SHA-256）跳到 /verify/[hash] 做浏览器自助复算；
 *       说明核验边界，免责口径读 evidence-constants.ts 常量
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: hash 形态校验改走 isContentHash（与核验页、核验接口同一单源）
 * - 2026-11-18: 初始创建（V5 Phase 1 /verify 核验入口）。表单 GET 提交；hash 形态在路由层用
 *               pattern 拦下，服务端只收合法形态；不返回草稿、未发布内容（反查口径在 DAL 强制 isPublished）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/SectionHead";
import { isContentHash } from "@/lib/canonical-hash";
import { EVIDENCE_DISCLAIMER } from "@/lib/evidence-constants";

export const metadata: Metadata = {
  title: "核验",
  description:
    "粘贴一条开发日志的内容摘要，在浏览器里本地复算 SHA-256，核对该版本自发布起未被改动。",
};

export const instant = false;

type VerifyPageProps = {
  searchParams: Promise<{ hash?: string | string[] }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  await connection();
  const hash = pick((await searchParams).hash)?.trim().toLowerCase();

  // 表单 GET 提交回本页：形态合法即转发到核验 permalink，非法形态留在入口提示
  if (hash && isContentHash(hash)) {
    redirect(`/verify/${hash}`);
  }

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <PageHeader
        eyebrow="VERIFY"
        title="内容核验"
        lede="把详情页「内容摘要」里的 64 位哈希粘贴进来，在你自己浏览器里复算比对——核验不依赖服务端结论。"
      />

      <form method="get" action="/verify" className="mt-8 flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-sans text-xs text-ink-soft">内容摘要（64 位小写十六进制）</span>
          <input
            name="hash"
            required
            pattern="[0-9a-f]{64}"
            autoComplete="off"
            spellCheck={false}
            placeholder="例如 a0197426…（完整 64 位）"
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          className="border border-ink px-5 py-2 font-sans text-sm text-ink hover:border-brown hover:text-brown"
        >
          核验这条摘要
        </button>
      </form>

      <div className="mt-10 border-t border-hairline pt-6 font-sans text-xs leading-relaxed text-ink-soft">
        <p>
          核验在浏览器本地完成：页面把该版本正文交给 WebCrypto 按对应口径（v1 原口径 / v2 规范化口径）
          复算 SHA-256，与存证值比对。服务端只提供该摘要对应的已发布版本信息，不参与结论。
        </p>
        <p className="mt-3">{EVIDENCE_DISCLAIMER}</p>
      </div>
    </main>
  );
}