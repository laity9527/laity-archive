/**
 * 文件：src/auth.ts
 * 描述：NextAuth 配置：GitHub OAuth + 不可变账号 ID 白名单，JWT 会话（不落库）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: I012-B 加 pages.signIn / pages.error 指向自建 /login，替换 NextAuth 默认页
 */
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

// 白名单放账号 ID 而非用户名：用户名可改，ID 不会变
export const ALLOWED_GITHUB_IDS = (process.env.ALLOWED_GITHUB_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function isAllowedGithubId(id: string | number | undefined | null) {
  if (id === undefined || id === null) {
    return false;
  }

  return ALLOWED_GITHUB_IDS.includes(String(id));
}

export const authOptions: NextAuthOptions = {
  // 登录页与错误页都指向自建页：默认页带圆角与浅色主题，与视觉铁律不符（I012-B）
  // 注意 pages.signIn 只作用于 GET，OAuth 仍必须由带 csrfToken 的 POST 发起
  pages: { signIn: "/login", error: "/login" },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ account }) {
      if (account?.provider !== "github") {
        return false;
      }

      return isAllowedGithubId(account.providerAccountId);
    },
    jwt({ token, account }) {
      if (account?.provider === "github") {
        token.githubId = account.providerAccountId;
      }

      return token;
    },
  },
};
