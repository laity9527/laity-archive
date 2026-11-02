/**
 * 文件：src/app/login/page.tsx
 * 描述：后台登录页：纸白单列，说明准入规则并给出 GitHub 登录入口；承接 NextAuth 回跳的 error 码
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建，替换 NextAuth 默认登录页；callbackUrl 只接受本站相对路径，防开放重定向
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignInButton } from "@/components/SignInButton";
import { authOptions } from "@/auth";
import { ERROR_TEXT } from "@/lib/error-text";
import { pickParam } from "@/lib/forms";

// 本页读会话与查询参数，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

// 只认本站相对路径：以 / 开头、不以 // 开头（后者是协议相对 URL，会跳到外部站点）
function safeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(pickParam(params.callbackUrl));
  const errorCode = pickParam(params.error);

  const session = await getServerSession(authOptions);

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 首页
      </Link>

      <h1 className="mt-10 text-3xl font-medium tracking-tight">后台登录</h1>
      <p className="mt-4 text-lg text-ink-soft">
        这里只有管理员进得来：用 GitHub 授权后，还要命中
        <span className="font-mono text-[15px] text-ink">ALLOWED_GITHUB_IDS</span>
        白名单才会放行。
      </p>

      {errorCode && (
        <p className="mt-8 border border-ink px-4 py-3 font-mono text-xs text-ink">
          {ERROR_TEXT[errorCode] ?? ERROR_TEXT.Default}
        </p>
      )}

      <div className="mt-10">
        <SignInButton callbackUrl={callbackUrl} />
      </div>

      <p className="mt-10 font-mono text-[11px] leading-relaxed text-ink-soft">
        访客不需要登录，前台的日志与项目档案直接可读。
      </p>
    </main>
  );
}
