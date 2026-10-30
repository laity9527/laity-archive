/**
 * 文件：src/components/Timeline.tsx
 * 描述：日志条目左侧 200px 的 BEFORE/AFTER 时间轴，1px 竖线贯穿整块
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，时间统一按 UTC 展示并显式标注
 */

type TimelineProps = {
  beforeDate: Date;
  afterDate: Date | null;
};

function formatUtc(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function Timeline({ beforeDate, afterDate }: TimelineProps) {
  return (
    <div className="relative w-full shrink-0 md:w-[200px]">
      <span
        aria-hidden
        className="absolute top-0 bottom-0 left-[3px] w-px bg-hairline"
      />
      <ol className="space-y-6">
        <li className="relative pl-5">
          <span
            aria-hidden
            className="absolute top-0 left-0 font-mono text-[10px] leading-4 text-ink"
          >
            ●
          </span>
          <span className="block font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            BEFORE
          </span>
          <time
            dateTime={beforeDate.toISOString()}
            className="mt-1 block font-mono text-xs text-ink"
          >
            {formatUtc(beforeDate)}
          </time>
        </li>
        <li className="relative pl-5">
          <span
            aria-hidden
            className="absolute top-0 left-0 font-mono text-[10px] leading-4 text-ink-soft"
          >
            {afterDate ? "●" : "○"}
          </span>
          <span className="block font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            AFTER
          </span>
          <time
            dateTime={afterDate ? afterDate.toISOString() : undefined}
            className="mt-1 block font-mono text-xs text-ink-soft"
          >
            {afterDate ? formatUtc(afterDate) : "进行中"}
          </time>
        </li>
      </ol>
    </div>
  );
}
