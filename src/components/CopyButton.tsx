/**
 * 文件：src/components/CopyButton.tsx
 * 描述：复制文本的小客户端组件：点击写入剪贴板，两秒内显示「已复制」；失败显示「复制失败」
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。详情页「档案凭据」卡需要复制链接与哈希；不引依赖，
 *               只用 navigator.clipboard，失败不静默（按钮原位改文案，aria-live 播报）
 */
"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label: string;
  // 传相对路径时，点击时用当前 origin 拼成绝对地址（复制链接用）
  withOrigin?: boolean;
};

type CopyState = "idle" | "done" | "fail";

export function CopyButton({
  text,
  label,
  withOrigin = false,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy() {
    const value = withOrigin
      ? new URL(text, window.location.origin).toString()
      : text;

    try {
      await navigator.clipboard.writeText(value);
      setState("done");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("fail");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className="border-b border-ink text-ink hover:bg-ink hover:text-paper"
    >
      {state === "done" ? "已复制" : state === "fail" ? "复制失败" : label}
    </button>
  );
}
