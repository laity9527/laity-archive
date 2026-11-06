/**
 * 文件：src/components/StatusBoard.tsx
 * 描述：首页档案状态看板：全部项目（含零日志），含类型、状态、日志数与最近更新日期
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建，数据由首页从已发布日志归并得到，不额外查询项目表
 * - 2026-11-02: latest 允许为 null（零日志项目不拿创建时间冒充最近更新），改由 src/lib/projects.ts 的 getArchiveBoard 供数
 * - 2026-11-05: 类型与状态两格改走 src/lib/labels.ts 的中文映射（去 toUpperCase），中文格由 font-mono 改 font-sans；带日期的最后一格保留 font-mono
 * - 2026-11-05: 最后一格再拆两层 span——「N 篇日志」与「尚未发布」走 font-sans、日期仍 font-mono（时间戳强制等宽属视觉铁律），外层只留 ml-auto 与字号色，避免 flex 的 gap-x-6 在两段之间撑出 24px
 */
import Link from "next/link";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";

export type StatusBoardEntry = {
  name: string;
  slug: string;
  kind: string;
  status: string;
  count: number;
  latest: Date | null;
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
          <Link
            href={`/projects/${entry.slug}`}
            className="text-base hover:underline hover:decoration-1 hover:underline-offset-4"
          >
            {entry.name}
          </Link>
          <span className="font-sans text-[11px] text-ink-soft">
            {kindLabel(entry.kind)}
          </span>
          <span className="font-sans text-[11px] text-ink-soft">
            {statusLabel(entry.status)}
          </span>
          <span className="ml-auto text-[11px] text-ink-soft">
            <span className="font-sans">{`${logsCountLabel(entry.count)} · `}</span>
            {entry.latest ? (
              <span className="font-mono">{entry.latest.toISOString().slice(0, 10)}</span>
            ) : (
              <span className="font-sans">尚未发布</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
