/**
 * 文件：src/app/error.tsx
 * 描述：前台渲染错误边界：出错时给可重试出口，不把内部异常细节暴露给访客
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 */
"use client";

import Link from "next/link";

// 有意不接 error prop：异常文本可能带内部路径与参数，不显示也不落到浏览器控制台
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">
        渲染出错了
      </p>
      <h1 className="mt-6 text-3xl font-medium">这一页没能正常显示</h1>
      <p className="mt-4 text-lg text-ink-soft">
        可能是数据库连接或内容读取出了问题。可以再试一次，或者回到可访问的页面。
      </p>
      <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-4">
        <button
          type="button"
          onClick={reset}
          className="border border-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-ink"
        >
          重试
        </button>
        <Link
          href="/"
          className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
        >
          返回首页 →
        </Link>
      </div>
    </main>
  );
}
