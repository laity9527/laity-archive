/**
 * 文件：src/components/Timeline.tsx
 * 描述：日志条目左侧 200px 的 BEFORE/AFTER 时间轴，1px 竖线贯穿整块
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，时间统一按 UTC 展示并显式标注
 * - 2026-11-02: formatUtc 改由 src/lib/time.ts 提供
 * - 2026-11-06: 宽度断点由视口改容器——根节点 `md:w-[200px]` → `@[36rem]:w-[200px]`。窄容器（首页右栏 344px）回退为整行宽，
 *               不再在右侧留 96px 空白；宽容器（≥576px 的列表与详情页）仍是左侧 200px 时间轴。四个调用点各自加 `@container` 承载
 */
import { formatUtc } from "@/lib/time";

type TimelineProps = {
  beforeDate: Date;
  afterDate: Date | null;
};

export function Timeline({ beforeDate, afterDate }: TimelineProps) {
  return (
    <div className="relative w-full shrink-0 @[36rem]:w-[200px]">
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
