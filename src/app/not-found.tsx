/**
 * 文件：src/app/not-found.tsx
 * 描述：未匹配路由的 404 页：与 /logs、/projects 的专属 404 同一套纸白版式，给出可用的去处
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。此前只有 Proxy 处理的两个路由有定制 404，其余地址落到框架默认页
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">
        404 · 页面不存在
      </p>
      <h1 className="mt-6 text-3xl font-medium">这个地址本站没有对应页面</h1>
      <p className="mt-4 text-lg text-ink-soft">
        可能是链接失效，也可能是本站把内容下架或删除了。可以从下面两个入口继续逛。
      </p>
      <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-4">
        <Link
          href="/logs"
          className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
        >
          全部开发日志 →
        </Link>
        <Link
          href="/projects"
          className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
        >
          作品档案 →
        </Link>
      </div>
    </main>
  );
}
