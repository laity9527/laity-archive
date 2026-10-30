/**
 * 文件：src/components/StatusBoard.tsx
 * 描述：首页档案状态看板：只展示已有公开日志的项目，含类型、状态与最近更新日期
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，数据由首页从已发布日志归并得到，不额外查询项目表
 */

export type StatusBoardEntry = {
  name: string;
  slug: string;
  kind: string;
  status: string;
  count: number;
  latest: Date;
};

type StatusBoardProps = {
  entries: StatusBoardEntry[];
};

export function StatusBoard({ entries }: StatusBoardProps) {
  if (entries.length === 0) {
    return (
      <p className="font-mono text-xs tracking-[0.2em] text-ink-soft">
        NO ARCHIVE YET
      </p>
    );
  }

  return (
    <ul className="border-t border-ink">
      {entries.map((entry) => (
        <li
          key={entry.slug}
          className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
        >
          <span
            aria-hidden
            className="font-mono text-[10px] text-ink"
          >
            {entry.status === "LIVE" ? "●" : "○"}
          </span>
          <span className="text-base">{entry.name}</span>
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">
            {entry.kind.toUpperCase()}
          </span>
          <span className="font-mono text-[11px] text-ink-soft">
            {entry.status}
          </span>
          <span className="ml-auto font-mono text-[11px] text-ink-soft">
            {entry.count} LOGS · {entry.latest.toISOString().slice(0, 10)}
          </span>
        </li>
      ))}
    </ul>
  );
}
