/**
 * 文件：src/app/login/page.tsx
 * 描述：后台登录页：纸白单列，说明准入规则并给出口令登录入口；承接 NextAuth 回跳的 error 码
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建，替换 NextAuth 默认登录页；callbackUrl 只接受本站相对路径，防开放重定向
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 * - 2026-11-04: 说明文案从"GitHub 授权 + 白名单"改为后台口令，不写出环境变量名
 * - 2026-11-04: 读会话前先 await connection()：预渲染里 NextAuth 会给缺失的 csrf cookie 生成随机值，
 *               Cache Components 判它不稳定，dev 下整条路由反复重渲染
 */
import Link from "next/link";
import { connection } from "next/server";
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
  // 先声明请求期渲染，再读会话：预渲染里 NextAuth 见不到 csrf cookie 就用 randomBytes 现造一个，
  // Cache Components 判它是不稳定值，dev 下这条路由会被反复重渲染（实测 8 秒 30 次 GET /login）
  await connection();

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(pickParam(params.callbackUrl));
  const errorCode = pickParam(params.error);

  // 声明"以下要读请求期数据"，本页不再进预渲染：否则 NextAuth 初始化时无 csrf cookie
  // 就用 crypto.randomBytes 现造一个，被 Cache Components 判成不稳定值并触发重渲染循环
  await connection();

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
        这里只有管理员进得来：登录用后台口令，口令只保存在服务器配置里，
        <span className="text-ink">不对外公开</span>
        。
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
