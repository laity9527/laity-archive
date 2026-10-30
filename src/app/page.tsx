/**
 * 文件：src/app/page.tsx
 * 描述：首页占位版（Phase 1）：标语与日志入口，完整看板在 Phase 2 实现
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1080px] px-6 py-24">
      <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
        不囤想法，直接上线。
      </h1>
      <p className="mt-6 max-w-xl text-lg text-[#5C5C5C]">
        用 AI 与代码把想法直接变成上线产品。记录每一次判断与踩坑。
      </p>
      <p className="mt-16 font-mono text-sm text-[#5C5C5C]">
        PHASE 1 · 数据来自本机 PostgreSQL
      </p>
      <Link
        href="/logs"
        className="mt-4 inline-block border-b border-[#131313] text-sm text-[#131313]"
      >
        查看开发日志 →
      </Link>
    </main>
  );
}