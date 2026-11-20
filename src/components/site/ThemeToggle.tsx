/**
 * 文件：src/components/ThemeToggle.tsx
 * 描述：亮色/暗色主题切换：写 html[data-theme] 与 localStorage，系统偏好变化时仅在未手动选择时跟随
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B1-a）。首屏主题由 layout 的内联脚本先定，避免闪白
 * - 2026-11-16: 改为 useSyncExternalStore 读取 DOM 上的主题状态：effect 里 setState 会被
 *               react-hooks/set-state-in-effect 判错（React Compiler 规则），而且"读 DOM 再回写 state"
 *               本质上就是外部存储订阅，useSyncExternalStore 是它的正解；服务端快照固定 light
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/site/（纯结构调整，组件逻辑/样式/导出未变）
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/ui/icons";

type Theme = "light" | "dark";

const STORAGE_KEY = "laity-theme";

// 极简外部存储：真值在 documentElement.dataset.theme（由内联脚本与切换动作写入），
// 这里只负责"变化时通知 React 重读"
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // 系统主题变化：用户手动选过就不跟随（手动优先）
  const onSystemChange = () => {
    if (readStored()) return;

    document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    emit();
  };

  // 多标签页同步：另一个标签改了主题，这里跟着变
  const onStorage = () => emit();

  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// 服务端与 hydration 阶段读不到 DOM，固定按亮色渲染；挂载后由 subscribe 校正
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 隐私模式下 localStorage 可能不可写：主题仍在本页生效，不弹错
    }

    emit();
  }, []);

  const label = theme === "dark" ? "切换到亮色主题" : "切换到暗色主题";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
      className="flex h-7 w-7 items-center justify-center border border-transparent text-ink-soft hover:border-ink hover:text-ink"
    >
      {theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
    </button>
  );
}
