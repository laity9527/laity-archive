/**
 * 文件：src/components/ShareButton.tsx
 * 描述：详情页「分享」：优先系统分享面板（Web Share），不支持或失败时退回复制链接
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G13）。桌面浏览器多数没有原生分享，所以不能只做一个
 *               「分享」按钮就完事：不支持时必须退回复制，且要让用户看见结果。
 *               用户取消分享（AbortError）不改按钮文案——取消不是失败。
 */
"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  // 站内相对路径；点击时用当前 origin 拼绝对地址
  path: string;
};

type ShareState = "idle" | "done" | "fail";

type ShareNavigator = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
};

export function ShareButton({ title, path }: ShareButtonProps) {
  const [state, setState] = useState<ShareState>("idle");

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();
    const nav = navigator as ShareNavigator;

    if (nav.share) {
      try {
        await nav.share({ title, url });
        return;
      } catch (error) {
        // 用户主动取消：保持原样，不提示失败，也不偷偷复制
        if ((error as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("done");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("fail");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-live="polite"
      className="inline-flex min-h-[32px] items-center border-b border-ink text-ink hover:bg-ink hover:text-paper max-sm:min-h-[40px]"
    >
      {state === "done"
        ? "已复制链接"
        : state === "fail"
          ? "分享失败"
          : "分享"}
    </button>
  );
}
