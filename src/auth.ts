/**
 * 文件：src/auth.ts
 * 描述：NextAuth 配置：本地管理员口令（Credentials）+ JWT 会话（不落库），并统一"管理员会话"的判定入口
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: I012-B 加 pages.signIn / pages.error 指向自建 /login，替换 NextAuth 默认页
 * - 2026-11-04: 按我点名"先取消 github 登录"：GitHub OAuth 与账号 ID 白名单换成 ADMIN_PASSWORD 口令登录
 * - 2026-11-04: 会话里带出 isAdmin 并加 requireAdminSession()，让守卫层与动作层用同一判据；
 *               authorize 加进程内登录节流（应用被直接暴露时的兜底，生产第一道在 nginx limit_req）
 * - 2026-11-04: 加配置体检（I050）：ADMIN_PASSWORD 缺失/短于 12 位、NEXTAUTH_SECRET 缺失/短于 32 位时，
 *               每进程往服务器日志写一条不含值的提示——否则本机漏配只有一个笼统的 401，
 *               排查的人会先去怀疑自己的口令抄错了
 * - 2026-11-04: 会话寿命显式设为 12 小时（v4 默认 30 天），D25：单口令后台的唯一吊销手段
 */
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  adminPasswordConfigured,
  attemptsLeft,
  clearLoginFailures,
  passwordMatches,
  registerFailure,
  throttleKeyOf,
} from "@/lib/admin-password";

// 配置体检每个进程只做一次：preflight 那几条只在生产编排里卡，本机漏配或口令过短时，
// 排查的人原本只看到一个笼统的 401。只报"哪一项不合格"，不回显任何值
let advised = false;

function adviseConfiguration() {
  if (advised) {
    return;
  }

  advised = true;

  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  const secret = (process.env.NEXTAUTH_SECRET ?? "").trim();
  const problems: string[] = [];

  if (!password) {
    problems.push("ADMIN_PASSWORD 未配置，登录一律拒绝");
  } else if (password.length < 12) {
    problems.push("ADMIN_PASSWORD 短于 12 位（生产 preflight 会直接拦下整个 up）");
  }

  if (!secret) {
    problems.push("NEXTAUTH_SECRET 未配置，v4 每次启动随机生成、重启即全员失效");
  } else if (secret.length < 32) {
    problems.push("NEXTAUTH_SECRET 短于 32 位");
  }

  if (problems.length > 0) {
    console.warn(`[admin] 配置体检：${problems.join("；")}（本条不含任何值）`);
  }
}

export const authOptions: NextAuthOptions = {
  // 登录页、错误页与退出页都指向自建页：默认页带圆角与浅色主题且是英文，与视觉铁律不符（I012-B / D23）
  // pages.signOut 管的是"直接访问 /api/auth/signout"这条 UI 之外的路径——按钮本身已改走 signOut()
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      id: "admin",
      name: "管理员口令",
      credentials: { password: { label: "口令", type: "password" } },
      authorize: (credentials, req) => {
        // 提示只进服务器日志，不进响应：公开页面不该告诉访客"这里没配口令"
        adviseConfiguration();

        if (!adminPasswordConfigured()) {
          return null;
        }

        const key = throttleKeyOf(req?.headers?.["x-forwarded-for"]);

        // 超窗口与口令错给完全一样的结果：不告诉尝试者"现在被限流了"，也不告诉他对不对
        if (attemptsLeft(key) <= 0) {
          return null;
        }

        if (!passwordMatches(credentials?.password)) {
          registerFailure(key);

          return null;
        }

        clearLoginFailures(key);

        return { id: "admin", name: "管理员" };
      },
    }),
  ],
  // 会话寿命从 v4 默认的 30 天收到 12 小时：后台只有一把口令，笔记本被拿到就等于一个月的管理员权限；
  // 代价是要更常输一次口令，而登录只有这一个门，收短是这里唯一能动的吊销手段
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  callbacks: {
    // 会话里只留一个布尔位：它只在 authorize 通过后写入，没有 NEXTAUTH_SECRET 签不出带它的 token
    jwt({ token, account }) {
      if (account?.provider === "admin") {
        token.isAdmin = true;
      }

      return token;
    },
    // 把同一个布尔位带到会话对象上，Server Action 才不必再造第二套口径（改对象而不是返回新字面量，
    // 是为了避开 Session 类型没有 isAdmin 这个键的多余属性检查）
    session({ session, token }) {
      Object.assign(session, { isAdmin: token.isAdmin === true });

      return session;
    },
  },
};

// 写动作与后台布局唯一该用的会话判定：既要会话在，也要它真带管理员标记
export async function requireAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (session as { isAdmin?: unknown }).isAdmin === true ? session : null;
}
