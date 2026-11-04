/**
 * 文件：src/components/SignInButton.tsx
 * 描述：登录页的口令表单：客户端调用 next-auth/react 的 signIn，由它取 CSRF token 后以 POST 发起登录
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建。服务端渲染的表单拿不到 csrf-token cookie，v4 的登录必须是带 csrfToken 的 POST，只能由客户端发起
 * - 2026-11-04: GitHub 按钮改为口令输入加提交，提供方 id 由 github 换成 credentials 的 admin
 */
"use client";

import { signIn } from "next-auth/react";
import type { FormEvent } from "react";

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");

    // CSRF 交给 next-auth/react 内部处理，不在页面里手写取 token；
    // redirect: true 时口令不对由 NextAuth 带回 /login?error=CredentialsSignin
    void signIn("admin", {
      password: typeof password === "string" ? password : "",
      callbackUrl,
      redirect: true,
    });
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[320px]">
      <label
        htmlFor="admin-password"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft"
      >
        管理员口令
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        className="mt-3 w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] text-ink"
      />
      <button
        type="submit"
        className="mt-6 border border-ink px-8 py-3 font-mono text-[11px] tracking-[0.2em] text-ink hover:bg-ink hover:text-paper"
      >
        登录 →
      </button>
    </form>
  );
}
