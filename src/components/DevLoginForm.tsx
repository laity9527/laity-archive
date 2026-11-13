/**
 * 文件：src/components/DevLoginForm.tsx
 * 描述：本地开发用的账号密码登录表单（仅当服务端启用 dev-admin 时渲染）
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。GitHub OAuth 临时不可用时的本地兜底；密码不写在前端，
 *               只提交给 Credentials provider，由服务端与 DEV_LOGIN_PASSWORD 比对
 */
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function DevLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "");
    const password = String(data.get("password") ?? "");

    setPending(true);
    setError(null);

    try {
      const result = await signIn("dev-admin", {
        username,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("账号或密码不正确。");
        return;
      }

      window.location.href = result?.url ?? callbackUrl;
    } catch {
      setError("登录请求失败，请查看服务端日志。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <p className="font-sans text-[10px] text-ink-soft">
        本地调试登录 · 仅开发环境
      </p>

      <label className="flex flex-col gap-1">
        <span className="font-sans text-[10px] text-ink-soft">用户名</span>
        <input
          name="username"
          defaultValue="admin"
          autoComplete="username"
          required
          className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-sans text-[10px] text-ink-soft">密码</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
      </label>

      {error && (
        <p role="alert" className="font-sans text-[11px] text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
      >
        {pending ? "登录中…" : "本地登录"}
      </button>

      <p className="font-sans text-[10px] leading-relaxed text-ink-soft">
        生产构建不启用；密码由服务端 DEV_LOGIN_PASSWORD 提供。
      </p>
    </form>
  );
}
