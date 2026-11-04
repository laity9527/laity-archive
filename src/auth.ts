/**
 * 文件：src/auth.ts
 * 描述：NextAuth 配置：本地管理员口令（Credentials）+ JWT 会话（不落库）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: I012-B 加 pages.signIn / pages.error 指向自建 /login，替换 NextAuth 默认页
 * - 2026-11-04: 按我点名"先取消 github 登录"：GitHub OAuth 与账号 ID 白名单换成 ADMIN_PASSWORD 口令登录
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { passwordMatches } from "@/lib/admin-password";

export const authOptions: NextAuthOptions = {
  // 登录页与错误页都指向自建页：默认页带圆角与浅色主题，与视觉铁律不符（I012-B）
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      id: "admin",
      name: "管理员口令",
      credentials: { password: { label: "口令", type: "password" } },
      authorize: (credentials) =>
        passwordMatches(credentials?.password)
          ? { id: "admin", name: "管理员" }
          : null,
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
  },
};
