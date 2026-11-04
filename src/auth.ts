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
 */
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  attemptsLeft,
  clearLoginFailures,
  passwordMatches,
  registerFailure,
  throttleKeyOf,
} from "@/lib/admin-password";

export const authOptions: NextAuthOptions = {
  // 登录页与错误页都指向自建页：默认页带圆角与浅色主题，与视觉铁律不符（I012-B）
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      id: "admin",
      name: "管理员口令",
      credentials: { password: { label: "口令", type: "password" } },
      authorize: (credentials, req) => {
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
  session: { strategy: "jwt" },
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
