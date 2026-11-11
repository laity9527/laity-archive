/**
 * 文件：src/components/ArticleToc.tsx
 * 描述：阅读目录客户端岛（F23/D34）：桌面 sticky 右栏 + 移动端 details 折叠面板，IntersectionObserver scrollspy；
 *       锚点自证——id/标签/文本与 extractToc 对不上就整体不画，宁缺毋指错
 * 作者：张磊
 * 创建日期：2026-11-11
 * 修改记录：
 * - 2026-11-11: 初始创建（编号 mono + 中文标题 sans；当前态主墨 + 2px 左边线，不给 --brown 扩权）；
 *               按 react-hooks 编译器规则收口：编号用纯偏移量算（渲染期不自增闭包变量），
 *               自证与 scrollspy 的 setState 只落在 IntersectionObserver 回调里（effect 体只做纯 DOM 读取）
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { TocItem } from "@/lib/toc";

export type TocGroup = {
  key: string;
  label: string;
  items: TocItem[];
};

// 与 globals.css 的 scroll-margin-top: 2rem 同口径：进度条 3px + 呼吸位
const TOP_OFFSET = 32;

// 文本对拍前剥掉空白与标点/符号：容忍两侧对强调记号、实体残留的口径差，
// 但标题正文不同必然不同——错位（指到别的标题）一定露馅
function normalize(text: string): string {
  return text.replace(/[\s\p{P}\p{S}]+/gu, "");
}

type TocState = { visible: boolean; activeId: string | null };

function useTocState(groups: TocGroup[]): TocState {
  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // SSR 先画（首屏与抓取可见），hydration 后由观察器回调自证；对不上才整体撤掉
  const [state, setState] = useState<TocState>({
    visible: true,
    activeId: items[0]?.id ?? null,
  });

  useEffect(() => {
    // effect 体内只做纯 DOM 读取，不落 state（react-hooks/set-state-in-effect）；
    // 自证与 scrollspy 的计算都收进 compute，只作为 IntersectionObserver 回调执行
    const headings: HTMLElement[] = [];
    let mismatch = false;
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (
        !el ||
        !/^H[123]$/.test(el.tagName) ||
        normalize(el.textContent ?? "") !== normalize(item.text)
      ) {
        mismatch = true;
        break;
      }
      headings.push(el);
    }

    const compute = () => {
      if (mismatch) {
        setState((prev) =>
          prev.visible ? { visible: false, activeId: null } : prev,
        );
        return;
      }
      // 取最后一个越过顶线的标题；长段落内部滚动不触发回调，也不需要触发
      let current = headings[0];
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= TOP_OFFSET + 1) {
          current = h;
        } else {
          break;
        }
      }
      const activeId = current.id;
      setState((prev) =>
        prev.visible && prev.activeId === activeId
          ? prev
          : { visible: true, activeId },
      );
    };

    const observer = new IntersectionObserver(compute, {
      rootMargin: `-${TOP_OFFSET}px 0px -70% 0px`,
      threshold: [0, 1],
    });
    // 错位时标题可能一个都找不到，观察 body 作哨兵保证 compute 至少跑一次；
    // 正常路径观察各标题，observe() 会排入一次初始交集计算，首帧后即落当前态
    const targets = mismatch ? [document.body] : headings;
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [items]);

  return state;
}

function TocLinks({
  groups,
  activeId,
}: {
  groups: TocGroup[];
  activeId: string | null;
}) {
  return (
    <>
      {groups.map((group, groupIndex) => {
        // 跨组连续编号：偏移量 = 前面各组的条目数之和，纯计算、渲染期无副作用
        const offset = groups
          .slice(0, groupIndex)
          .reduce((sum, g) => sum + g.items.length, 0);
        return (
          <div key={group.key} className="toc-group-block">
            <p className="toc-group font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              {group.label}
            </p>
            <ol className="toc-list">
              {group.items.map((item, itemIndex) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="toc-link"
                    data-level={item.level}
                    aria-current={activeId === item.id ? "location" : undefined}
                  >
                    <span className="toc-num font-mono text-[10px]">
                      {String(offset + itemIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="toc-title font-sans line-clamp-2">
                      {item.text || "（无标题）"}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </>
  );
}

// 桌面右栏：外层 div 是 grid 项（随正文列撑满高度），nav 在其内 sticky 随行
export function ArticleTocRail({ groups }: { groups: TocGroup[] }) {
  const { visible, activeId } = useTocState(groups);
  if (!visible) return null;
  return (
    <div className="hidden lg:block">
      <nav aria-label="阅读目录" className="toc-rail">
        <p className="font-sans text-[12px] text-ink-soft">目录</p>
        <TocLinks groups={groups} activeId={activeId} />
      </nav>
    </div>
  );
}

// 移动端折叠面板：details/summary 原生开合（零 JS）；lg 起隐藏（右栏接管）
export function ArticleTocPanel({ groups }: { groups: TocGroup[] }) {
  const { visible, activeId } = useTocState(groups);
  if (!visible) return null;
  const count = groups.reduce((sum, g) => sum + g.items.length, 0);
  return (
    <details className="toc-panel mt-8 lg:hidden">
      <summary className="font-sans text-[12px] text-ink-soft">
        <span>目录</span>
        <span className="toc-panel-count font-mono text-[10px]">{count} 节</span>
      </summary>
      <div className="toc-panel-body">
        <TocLinks groups={groups} activeId={activeId} />
      </div>
    </details>
  );
}