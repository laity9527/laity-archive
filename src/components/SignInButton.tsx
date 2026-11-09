/**
 * 文件：src/components/SignInButton.tsx
 * 描述：登录页的 GitHub 一键按钮：客户端调用 next-auth/react 的 signIn，由它取 CSRF token 后以 POST 发起 OAuth 登录；提交中禁用按钮
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建。服务端渲染的表单拿不到 csrf-token cookie，v4 的登录必须是带 csrfToken 的 POST，只能由客户端发起
 * - 2026-11-04: GitHub 按钮改为口令输入加提交，提供方 id 由 github 换成 credentials 的 admin
 * - 2026-11-04: 提交期间禁用按钮并换文案——原本连点会并发发多次登录 POST
 * - 2026-11-09: 口令框旁加纯字符 [显示]/[隐藏] 切换（type=button 不触发提交），Enter 提交不受影响
 * - 2026-11-09: V2.0 Step 4-A：换回 GitHub 一键登录——口令输入框与显隐切换一并退役，
 *               按钮直接 signIn("github")；服务端渲染拿不到 csrf-token cookie 的约束不变
 */
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type SignInButtonProps = {
  callbackUrl: string;
};

export function SignInButton({ callbackUrl }: SignInButtonProps) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      // CSRF 交给 next-auth/react 内部处理，不在页面里手写取 token；
      // redirect: true 时成功直接进 callbackUrl，OAuth 失败由 NextAuth 带回 /login?error=…
      await signIn("github", { callbackUrl, redirect: true });
    } finally {
      // 正常路径这里走不到（整页已跳转）；留它是为了请求抛错、人还停在页面时按钮不致死
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending ? true : undefined}
      className="w-full max-w-[320px] border border-ink px-8 py-3 font-mono text-[11px] tracking-[0.2em] text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
    >
      {pending ? "登录中…" : "[ 使用 GitHub 登录 ]"}
    </button>
  );
}
