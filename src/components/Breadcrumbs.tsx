/**
 * 文件：src/components/Breadcrumbs.tsx
 * 描述：层级面包屑：末项为当前页（不可点，aria-current="page"），分隔符走等宽斜杠
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。详情页原先只有一个「← 开发日志」回跳，
 *               读者看不出自己在站点里的位置；改为 档案 / 开发日志 / 项目 三段，
 *               末项不渲染链接，避免"点了回到自己"
 */

import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="面包屑">
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-soft">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-baseline gap-2">
              {index > 0 && (
                <span aria-hidden className="font-mono text-[10px] text-ink-soft">
                  /
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="border-b border-transparent hover:border-ink hover:text-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-ink" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
