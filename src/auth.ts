/**
 * 文件：src/auth.ts
 * 描述：NextAuth 配置：GitHub OAuth + 不可变账号 ID 白名单，JWT 会话（不落库）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
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
