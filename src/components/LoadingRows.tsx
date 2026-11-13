/**
 * 文件：src/components/LoadingRows.tsx
 * 描述：Suspense 的静态加载骨架：用暖线占位行替代「加载中…」文本，零 JS、零动画
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（B4）。只画 1px 暖线与留白，不引入 shimmer / 渐变 / 圆角；
 *               读屏只播报一次「加载中…」，视觉占位对辅助技术隐藏
 */

type LoadingRowsProps = {
  rows?: number;
};

export function LoadingRows({ rows = 3 }: LoadingRowsProps) {
  return (
    <div role="status" aria-live="polite" className="border-t border-ink">
      <span className="sr-only">加载中…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          aria-hidden
          className="flex flex-col gap-6 border-b border-hairline py-10 md:flex-row md:gap-10"
        >
          <div className="w-full shrink-0 space-y-3 md:w-[140px]">
            <div className="h-px w-20 bg-hairline" />
            <div className="h-px w-28 bg-hairline" />
            <div className="h-px w-24 bg-hairline" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-px w-24 bg-hairline" />
            <div className="h-px w-3/4 bg-hairline" />
            <div className="h-px w-1/2 bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}
