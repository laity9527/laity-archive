/**
 * 文件：src/app/login/page.tsx
 * 描述：后台登录页：纸白单列，说明准入规则并给出 GitHub 登录入口；承接 NextAuth 回跳的 error 码
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建，替换 NextAuth 默认登录页；callbackUrl 只接受本站相对路径，防开放重定向
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignInButton } from "@/components/SignInButton";
import { authOptions } from "@/auth";

// 读会话与查询参数，整段阻塞渲染，不出静态壳
export const instant = false;

const ERROR_TEXT: Record<string, string> = {
  AccessDenied: "这个 GitHub 账号不在白名单里，登录被拒绝。",
  Verification: "登录链接已过期，请重新发起登录。",
  Configuration: "登录配置有误：检查 GITHUB_ID / GITHUB_SECRET / NEXTAUTH_URL 与 OAuth 回调地址。",
  Default: "登录没有完成，可以再试一次。",
};

function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

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
