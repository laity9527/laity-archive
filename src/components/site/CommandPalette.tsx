/**
 * 文件：src/components/CommandPalette.tsx
 * 描述：⌘K 全局搜索面板：输入即查日志 / 项目 / 标签，方向键选择、回车跳转、Esc 关闭
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。此前搜索只存在于 /logs 页内；面板由 SiteNav 按需挂载
 *               （未打开时不加载组件），查询走 /api/search，结果限 6 条日志 / 4 个项目 / 6 个标签。
 *               键盘：↑↓ 移动、Enter 跳转、Esc 关闭；焦点在打开时进输入框，关闭交还触发按钮
 * - 2026-11-16: 评审 G3：结果底部加「在大厅中查看全部结果」，把 q 交给 /logs 的搜索（面板只展示前 6 条日志）
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/site/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：输入框改 combobox 语义（aria-expanded/controls/activedescendant），
 *               结果项去掉 option 内嵌按钮（焦点留在输入框，方向键选择由 aria-activedescendant 播报）；
 *               补焦点陷阱（Tab 循环）与 Esc 全面板生效；去掉 outline-none 恢复焦点框；状态提示进活区
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@/components/ui/icons";

type ResultItem = {
  key: string;
  label: string;
  meta: string;
  href: string;
};

type ApiResult = {
  logs: { title: string; slug: string; handle: string; project: string }[];
  projects: { name: string; slug: string; handle: string }[];
  tags: { tag: string; count: number }[];
};

type CommandPaletteProps = {
  onClose: () => void;
};

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // 打开即聚焦输入框（只动 DOM，不写 state，避免 set-state-in-effect）
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  // 方向键把当前项移进可视区：结果区限高滚动，选中项不能在视野外
  useEffect(() => {
    if (items.length === 0) return;
    document
      .getElementById(`cp-option-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, items.length]);

  // 输入防抖查询：setState 只发生在定时器与 fetch 回调里
  useEffect(() => {
    const value = q.trim();

    if (!value) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("SEARCH_FAILED");

        const data = (await response.json()) as ApiResult;
        const next: ResultItem[] = [
          ...data.logs.map((item) => ({
            key: `log-${item.handle}-${item.slug}`,
            label: item.title,
            meta: `日志 · ${item.project}`,
            href: `/u/${item.handle}/logs/${item.slug}`,
          })),
          ...data.projects.map((item) => ({
            key: `project-${item.handle}-${item.slug}`,
            label: item.name,
            meta: "项目",
            href: `/u/${item.handle}/projects/${item.slug}`,
          })),
          ...data.tags.map((item) => ({
            key: `tag-${item.tag}`,
            label: item.tag,
            meta: `标签 · ${item.count} 条`,
            href: `/tags/${encodeURIComponent(item.tag)}`,
          })),
        ];

        setItems(next);
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  function go(item?: ResultItem) {
    const target = item ?? items[active];

    if (!target) return;

    onClose();
    router.push(target.href);
  }

  function handleChange(value: string) {
    setQ(value);

    // 清空时立即清结果（在事件里做，不靠 effect 同步 setState）
    if (!value.trim()) {
      setItems([]);
      setActive(0);
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        items.length === 0 ? 0 : (index - 1 + items.length) % items.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      go();
    }
  }

  // Esc 与焦点陷阱挂在面板层：焦点无论落在输入框还是「查看全部」按钮都能关；
  // aria-modal 对话框里 Tab 不允许逃到背景页面
  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>("input, button"),
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(10_9_8_/_0.55)] px-4 pt-24"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="w-full max-w-[560px] border border-ink bg-paper p-4"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-hairline pb-2">
          <span aria-hidden className="text-ink-soft">
            <IconSearch size={14} />
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索日志 / 项目 / 标签"
            aria-label="搜索关键词"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-palette-listbox"
            aria-activedescendant={
              items.length > 0 ? `cp-option-${active}` : undefined
            }
            className="w-full bg-transparent font-sans text-sm text-ink"
          />
          <kbd className="shrink-0 font-mono text-[10px] text-ink-soft">ESC</kbd>
        </div>

        <div className="mt-3 max-h-[50vh] overflow-y-auto">
          {/* 状态提示进常驻活区：搜索中/无结果/引导文案变化时读屏播报 */}
          <div aria-live="polite">
            {loading && (
              <p className="py-3 font-sans text-xs text-ink-soft">搜索中…</p>
            )}

            {!loading && q.trim() && items.length === 0 && (
              <p className="py-3 font-sans text-xs text-ink-soft">
                没有匹配结果
              </p>
            )}

            {!q.trim() && (
              <p className="py-3 font-sans text-xs text-ink-soft">
                输入关键词；↑↓ 选择，Enter 打开
              </p>
            )}
          </div>

          {items.length > 0 && (
            <ul
              id="command-palette-listbox"
              role="listbox"
              aria-label="搜索结果"
            >
              {items.map((item, index) => (
                <li
                  key={item.key}
                  id={`cp-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onClick={() => go(item)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex w-full cursor-pointer items-baseline justify-between gap-4 border-b border-hairline py-2 text-left font-sans text-xs ${
                    index === active
                      ? "border-l-2 border-l-brown pl-2 text-ink"
                      : "border-l-2 border-l-transparent pl-2 text-ink-soft"
                  }`}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-soft">
                    {item.meta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 面板只给前 6 条日志；完整结果（含筛选、排序、分页）在大厅 */}
        {q.trim() && (
          <div className="mt-3 border-t border-hairline pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/logs?q=${encodeURIComponent(q.trim())}`);
              }}
              className="flex w-full items-baseline justify-between gap-4 py-1 text-left font-sans text-xs text-ink hover:underline hover:decoration-1 hover:underline-offset-4"
            >
              <span>在大厅中查看全部结果</span>
              <span aria-hidden className="font-mono text-[10px] text-ink-soft">
                →
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
