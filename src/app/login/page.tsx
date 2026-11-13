/**
 * 文件：src/app/login/page.tsx
 * 描述：后台登录页：左侧说明与品牌、右侧 GitHub 一键登录；承接 NextAuth 回跳的 error 码
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: I012-B 创建，替换 NextAuth 默认登录页；callbackUrl 只接受本站相对路径，防开放重定向
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 * - 2026-11-04: 说明文案从"GitHub 授权 + 白名单"改为后台口令，不写出环境变量名
 * - 2026-11-04: 已登录判定改走 requireAdminSession：只把"带管理员标记的会话"跳进后台，
 *               非管理员会话不该被自动送进 /admin 再被守卫弹回来
 * - 2026-11-04: 读会话前先 await connection()：预渲染里 NextAuth 会给缺失的 csrf cookie 生成随机值，
 *               Cache Components 判它不稳定，dev 下整条路由反复重渲染
 * - 2026-11-04: safeCallbackUrl 搬到 src/lib/forms.ts 并补上反斜杠判定（D26）：留在页面里就测不到，
 *               而 `/\host` 这种写法能绕过只挡 `//` 的旧判定跳去外站
 * - 2026-11-04: 错误横幅补 role="alert"、<main> 补 id="main"（D27）：这张页不在前台导航的
 *               管辖里，此前既没有可读出的活区，也没有可跳转的正文地标
 * - 2026-11-04: 删掉第二次 await connection()（I059）：同一个函数连调两次、注释各说一套，
 *               第一处已经在读会话之前声明了请求期渲染，第二处什么都不做
 * - 2026-11-09: V2.0 Step 4-A：口令登录换回 GitHub OAuth 一键——口令输入框整段退役，页面只剩一个大按钮；
 *               说明文案改 GitHub 登录口径；会话判定仍走 requireAdminSession（4-B 把 /admin 改个人控制台后退役）
 * - 2026-11-13: 显著升级 B3：单列居中改左右分栏（说明 + 登录卡），补「访客无需登录」与品牌收口；
 *               中文标签从 Mono 改回 Inter（视觉铁律 2026-11-06 口径），鉴权逻辑与 callbackUrl 校验一字未动
 */
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/SignInButton";
import { requireAdminSession } from "@/auth";
import { ERROR_TEXT } from "@/lib/error-text";
import { pickParam, safeCallbackUrl } from "@/lib/forms";

// 本页读会话与查询参数，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // 先声明请求期渲染，再读会话：预渲染里 NextAuth 见不到 csrf cookie 就用 randomBytes 现造一个，
  // Cache Components 判它是不稳定值，dev 下这条路由会被反复重渲染（实测 8 秒 30 次 GET /login）
  await connection();

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(pickParam(params.callbackUrl));
  const errorCode = pickParam(params.error);

  const session = await requireAdminSession();

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-[960px] flex-col justify-center px-6 py-16"
    >
      <div className="grid border border-hairline md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="p-8 md:p-12">
          <Link
            href="/"
            className="font-sans text-xs text-ink-soft hover:text-ink"
          >
            ← 返回首页
          </Link>

          <p className="mt-10 font-mono text-[9px] tracking-[0.2em] text-ink-soft">
            ADMINISTRATION
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight md:text-4xl">
            后台是写档案的地方，
            <br />
            不是另一个网站。
          </h1>
          <p className="mt-5 max-w-[420px] text-sm leading-relaxed text-ink-soft">
            登录后可以新建项目与日志、从 GitHub 拉取提交草稿、导出全部数据。访客不需要账号，前台的日志与项目档案直接可读。
          </p>

          <p className="mt-10 font-mono text-[10px] tracking-[0.2em] text-ink-soft">
            LAITY ARCHIVE
          </p>
          <p className="mt-2 font-sans text-[11px] leading-relaxed text-ink-soft">
            仅站主一个账号 · GitHub OAuth
            <br />
            登录信息不进入前台页面
          </p>
        </section>

        <section className="flex flex-col justify-center border-t border-hairline p-8 md:border-l md:border-t-0">
          <p className="font-sans text-[10px] text-ink-soft">后台登录</p>

          {errorCode && (
            <p
              role="alert"
              className="mt-4 border border-ink px-4 py-3 font-sans text-xs leading-relaxed text-ink"
            >
              {ERROR_TEXT[errorCode] ?? ERROR_TEXT.Default}
            </p>
          )}

          <div className="mt-5">
            <SignInButton callbackUrl={callbackUrl} />
          </div>

          <p className="mt-3 font-sans text-[11px] leading-relaxed text-ink-soft">
            登录后回到你刚才想去的页面。
          </p>

          <p className="mt-8 border-t border-hairline pt-4 font-sans text-[11px] leading-relaxed text-ink-soft">
            无账号？前台内容无需登录。
          </p>
        </section>
      </div>

      <p className="mt-6 text-center font-mono text-[10px] text-ink-soft">
        © 2026 LAITY
      </p>
    </main>
  );
}
