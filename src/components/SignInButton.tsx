/**
 * 文件：src/components/SignInButton.tsx
 * 描述：登录页的 GitHub 登录按钮：客户端调用 next-auth/react 的 signIn，由它取 CSRF token 后以 POST 发起 OAuth
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建。服务端渲染的表单拿不到 csrf-token cookie，v4 的 OAuth 必须是带 csrfToken 的 POST，只能由客户端发起
 */
"use client";

import { signIn } from "next-auth/react";

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  return (
    <button
      // 只有这一个交互点需要 CSRF，交给 next-auth/react 内部处理，不在页面里手写 csrf 获取
      onClick={() => signIn("github", { callbackUrl, redirect: true })}
      className="border border-ink px-8 py-3 font-mono text-[11px] tracking-[0.2em] text-ink hover:bg-ink hover:text-paper"
    >
      用 GITHUB 登录 →
    </button>
  );
}
