/**
 * 文件：src/components/SignOutButton.tsx
 * 描述：后台退出按钮：客户端直接发起 signOut，一步回首页，不再经过 NextAuth 的英文确认页
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（I012-B 只替换了登录页，退出仍落框架默认页）
 * - 2026-11-13: 后台侧栏改为深墨底，新增 tone="dark" 变体；中文按钮文案改走 Inter
 */
"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type SignOutButtonProps = {
  callbackUrl?: string;
  tone?: "light" | "dark";
};

export function SignOutButton({
  callbackUrl = "/",
  tone = "light",
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      // signOut 自己带 CSRF 发 POST；不给二次确认的机会，退出后没有可丢的现场（草稿在库里，不在表单里）
      await signOut({ callbackUrl, redirect: true });
    } finally {
      setPending(false);
    }
  }

  const toneClass =
    tone === "dark"
      ? "border-paper/40 text-paper hover:text-paper/70 disabled:border-paper/20 disabled:text-paper/40"
      : "border-ink text-ink hover:text-ink-soft disabled:border-hairline disabled:text-ink-soft";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending ? true : undefined}
      className={`border-b font-sans text-xs ${toneClass}`}
    >
      {pending ? "退出中…" : "退出"}
    </button>
  );
}
