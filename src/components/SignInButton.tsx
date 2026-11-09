/**
 * 文件：src/components/SignInButton.tsx
 * 描述：登录页的口令表单：客户端调用 next-auth/react 的 signIn，由它取 CSRF token 后以 POST 发起登录；提交中禁用按钮
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建。服务端渲染的表单拿不到 csrf-token cookie，v4 的登录必须是带 csrfToken 的 POST，只能由客户端发起
 * - 2026-11-04: GitHub 按钮改为口令输入加提交，提供方 id 由 github 换成 credentials 的 admin
 * - 2026-11-04: 提交期间禁用按钮并换文案——原本连点会并发发多次登录 POST
 * - 2026-11-09: 口令框旁加纯字符 [显示]/[隐藏] 切换（type=button 不触发提交），Enter 提交不受影响
 */
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type { FormEvent } from "react";

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const password = new FormData(event.currentTarget).get("password");

    setPending(true);

    try {
      // CSRF 交给 next-auth/react 内部处理，不在页面里手写取 token；
      // redirect: true 时成功直接进 callbackUrl，口令不对由 NextAuth 带回 /login?error=CredentialsSignin
      await signIn("admin", {
        password: typeof password === "string" ? password : "",
        callbackUrl,
        redirect: true,
      });
    } finally {
      // 正常路径这里走不到（整页已跳转）；留它是为了请求抛错、人还停在页面时按钮不致死
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[320px]">
      <label
        htmlFor="admin-password"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft"
      >
        管理员口令
      </label>
      <div className="mt-3 flex items-center gap-3">
        <input
          id="admin-password"
          name="password"
          type={revealed ? "text" : "password"}
          autoComplete="current-password"
          className="w-full min-w-0 flex-1 border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] text-ink"
        />
        <button
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="shrink-0 font-mono text-[11px] text-ink-soft hover:text-ink"
        >
          {revealed ? "[隐藏]" : "[显示]"}
        </button>
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending ? true : undefined}
        className="mt-6 border border-ink px-8 py-3 font-mono text-[11px] tracking-[0.2em] text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
      >
        {pending ? "登录中…" : "登录 →"}
      </button>
    </form>
  );
}
