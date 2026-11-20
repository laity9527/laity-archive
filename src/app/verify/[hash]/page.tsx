/**
 * 文件：src/app/verify/[hash]/page.tsx
 * 描述：核验结果 permalink：按内容摘要反查已发布版本，展示版本信息并交给 VerifyPanel
 *       在浏览器本地复算比对；草稿与未发布内容一律 notFound（不泄露存在性）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1 /verify）。hash 形态非法直接 notFound；
 *               反查走 getPublishedRevisionByHash（DAL 内强制 isPublished）；
 *               正文经 props 传给客户端组件，复算全部在浏览器完成，不依赖服务端结论
 * - 2026-11-18: hash 形态校验改走 isContentHash（单源）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { VerifyPanel } from "@/components/VerifyPanel";
import { getPublishedRevisionByHash } from "@/lib/logs";
import { isContentHash, CANONICAL_RULES_TEXT } from "@/lib/canonical-hash";

export const instant = false;

type VerifyHashPageProps = {
  params: Promise<{ hash: string }>;
};

export async function generateMetadata({ params }: VerifyHashPageProps): Promise<Metadata> {
  const { hash } = await params;

  if (!isContentHash(hash)) {
    return { title: "核验结果" };
  }

  const revision = await getPublishedRevisionByHash(hash);

  if (!revision) {
    return { title: "核验结果" };
  }

  return {
    title: `核验 · ${revision.trace.slug} v${revision.version}`,
    description: "浏览器本地复算 SHA-256，与该版本发布时的存证值比对。",
    robots: { index: false, follow: false },
  };
}

export default async function VerifyHashPage({ params }: VerifyHashPageProps) {
  const { hash } = await params;
  await connection();

  if (!isContentHash(hash)) {
    notFound();
  }

  const revision = await getPublishedRevisionByHash(hash);

  if (!revision) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/verify"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 换一条摘要
      </Link>

      <header className="mt-8 border-b border-ink pb-8">
        <p className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">VERIFY</p>
        <h1 className="mt-3 text-[32px] font-medium tracking-tight">
          {revision.trace.title}
        </h1>
        <p className="mt-2 font-sans text-xs text-ink-soft">
          {revision.trace.slug} · 第 <span className="font-mono">v{revision.version}</span> 版 ·
          存证值 <span className="font-mono">{revision.contentHash.slice(0, 16)}…</span>
        </p>
      </header>

      <div className="mt-8">
        <VerifyPanel
          title={revision.title}
          beforeContent={revision.beforeContent}
          afterContent={revision.afterContent}
          storedHash={revision.contentHash}
          hashVersion={revision.hashVersion === 2 ? 2 : 1}
          rulesText={CANONICAL_RULES_TEXT}
          publishedAt={revision.publishedAt}
          version={revision.version}
          slug={revision.trace.slug}
        />
      </div>

      <p className="mt-6 font-sans text-xs text-ink-soft">
        版本详情与发布快照见该轨迹的详情页（可加 <span className="font-mono">?v={revision.version}</span> 直达本版）。
      </p>
    </main>
  );
}