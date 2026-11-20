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
 * - 2026-11-17: 同文件新增 `PageHeader`（索引页统一头部）。不新建源文件，避免软著收录清单
 *               因新增文件触发 assertComplete；标题/引导/统计/右侧动作四段固定，页间距统一
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/site/（纯结构调整，组件逻辑/样式/导出未变）
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

type PageHeaderProps = {
  eyebrow?: string;
  meta?: ReactNode;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** 索引页统一头部：引导行 → H1 32 → 说明 → 1px 墨线 */
export function PageHeader({ eyebrow, meta, title, lede, action, className = "" }: PageHeaderProps) {
  const hasMeta = Boolean(eyebrow || meta);

  return (
    <header className={`border-b border-ink pb-8 ${className}`}>
      {hasMeta && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {eyebrow && <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">{eyebrow}</span>}
          {meta && <span className="font-sans text-xs text-ink-soft">{meta}</span>}
        </p>
      )}
      <div className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 ${hasMeta ? "mt-3" : ""}`}>
        <h1 className="text-[32px] font-medium tracking-tight">{title}</h1>
        {action}
      </div>
      {lede && <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ink-soft">{lede}</p>}
    </header>
  );
}
