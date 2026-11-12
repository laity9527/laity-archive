/**
 * 文件：src/app/tags/[tag]/page.tsx
 * 描述：标签聚合页：列出带该标签的全部已发布日志，列表行复用大厅形态（F26）
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F26 标签聚合页 Commit 4：页面 + 链接接线。params 实测为编码原样（dev 探针），
 *               入口先 decodeTagParam 解码一次再 normalizeTag；0 行 notFound；
 *               Timeline 容器查询第六个调用点，ul 必须带 @container）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/Timeline";
import { decodeTagParam, normalizeTag } from "@/lib/forms";
import { getSafeLogs } from "@/lib/logs";

// 查库必然阻塞，instant = false 只用于退出即时导航校验，不改渲染方式（与详情页同理）
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  const normalized = normalizeTag(decodeTagParam(tag));

  if (!normalized) {
    return { title: "标签不存在" };
  }

  const logs = await getSafeLogs({ tag: normalized });

  if (logs.length === 0) {
    return { title: "标签不存在" };
  }

  return {
    title: `标签 ${normalized}`,
    description: `该标签下共 ${logs.length} 条已发布日志，均为 Before/After 开发复盘，附正文 SHA-256 摘要与发布时间。`,
  };
}

function tagLink(tag: string) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="hover:text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
    >
      {tag}
    </Link>
  );
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  // 参数实测为编码原样（dev 探针）：先解码一次再归一化，解码失败由 normalizeTag 拒收
  const normalized = normalizeTag(decodeTagParam(tag));

  if (!normalized) {
    notFound();
  }

  const logs = await getSafeLogs({ tag: normalized });

  if (logs.length === 0) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-[1080px] px-6 py-24">
      <h1 className="mb-12 text-4xl font-medium tracking-tight">标签：{normalized}</h1>
      <p className="mb-12 font-sans text-sm text-ink-soft">
        {logs.length} 条已发布日志 ·{" "}
        <Link
          href="/logs"
          className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          ← 返回日志大厅
        </Link>
      </p>
      <ul className="@container border-t border-ink">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex flex-col gap-6 border-b border-hairline py-10 md:flex-row md:gap-10"
          >
            <Timeline beforeDate={log.beforeDate} afterDate={log.afterDate} />
            <article className="flex-1">
              <p className="font-mono text-[11px] tracking-[0.1em] text-ink-soft">
                {log.project.name}
              </p>
              <h2 className="mt-2 text-2xl font-medium">
                <Link
                  href={`/u/${log.user.handle}/logs/${log.slug}`}
                  className="hover:underline hover:decoration-1 hover:underline-offset-4"
                >
                  {log.title}
                </Link>
              </h2>
              {log.tags.length > 0 && (
                <p className="mt-3 font-mono text-[11px] text-ink-soft">
                  {log.tags.map((item, i) => (
                    <span key={item}>
                      {i > 0 && " · "}
                      {tagLink(item)}
                    </span>
                  ))}
                </p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
}
