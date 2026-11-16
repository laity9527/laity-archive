/**
 * 文件：src/components/SectionHead.tsx
 * 描述：区块头：编号 + 中文标题 + 右侧动作，底部 1px 分隔线（B0 设计底座）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。把首页四处「小标题 + 右侧入口」的重复结构
 *               收成一个组件，编号走 mono 10px、标题走 sans 12px，层级靠线不靠加粗
 * - 2026-11-16: 补 `mono` 开关：BEFORE / AFTER 属英文系统标识，按视觉规则必须等宽，
 *               中文区块（经验总结等）仍走 sans
 */

import type { ReactNode } from "react";

type SectionHeadProps = {
  // 两位编号（01 / 02 …），纯装饰，读屏跳过
  index: string;
  title: string;
  // 右侧入口（"全部作品 →" 这类），无则不渲染
  action?: ReactNode;
  // 标题走等宽（BEFORE / AFTER 这类英文系统标识）；中文区块保持 sans
  mono?: boolean;
};

export function SectionHead({ index, title, action, mono = false }: SectionHeadProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hairline pb-3">
      <h2 className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="font-mono text-[10px] tracking-[0.12em] text-ink-soft"
        >
          {index}
        </span>
        <span
          className={
            mono
              ? "font-mono text-xs tracking-[0.18em] text-ink-soft"
              : "font-sans text-xs tracking-[0.16em] text-ink-soft"
          }
        >
          {title}
        </span>
      </h2>
      {action}
    </div>
  );
}
