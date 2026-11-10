/**
 * 文件：src/auth.ts
 * 描述：NextAuth 配置：GitHub OAuth（V2.0 Step 4-A）+ JWT 会话（不落库），并统一后台会话的判定入口
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
 * - 2026-11-09: V2.0 Step 4-A：换回 GitHub OAuth——Credentials 单口令与 admin-password 节流一并退役；
 *               认领/建号跑在首次登录的 jwt 回调里（v4 的 authorize 是 provider 配置项、不属于 AuthOptions），
 *               按 githubId → handle → 新建 认领旧账号（zhanglei 保留其 12 篇日志）或建新号；
 *               jwt 载荷带 userId（4-B 数据归属用）与 isAdmin（/admin 准入，4-B 改个人控制台后退役）；
 *               配置体检收窄到 NEXTAUTH_SECRET；登录节流由 nginx limit_req（callback 端点）承担
 * - 2026-11-09: V2.0 Step 4-B：/admin 改个人控制台——requireAdminSession 改判 userId 存在性并返回
 *               带 userId 的会话类型；isAdmin 不再进 jwt 与会话（库字段保留，准入不再读它）
 */
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { db } from "@/lib/db";

// 配置体检每个进程只做一次：只报"哪一项不合格"，不回显任何值
let advised = false;

function adviseConfiguration() {
  if (advised) {
    return;
  }

  advised = true;

  const secret = (process.env.NEXTAUTH_SECRET ?? "").trim();

  if (!secret) {
    console.warn(
      "[auth] 配置体检：NEXTAUTH_SECRET 未配置，v4 每次启动随机生成、重启即全员失效（本条不含任何值）",
    );
  } else if (secret.length < 32) {
    console.warn("[auth] 配置体检：NEXTAUTH_SECRET 短于 32 位（本条不含任何值）");
  }
}

export const authOptions: NextAuthOptions = {
  // 登录页、错误页与退出页都指向自建页：默认页带圆角与浅色主题且是英文，与视觉铁律不符（I012-B / D23）
  // pages.signOut 管的是"直接访问 /api/auth/signout"这条 UI 之外的路径——按钮本身已改走 signOut()
  pages: { signIn: "/login", signOut: "/login", error: "/login" },
  providers: [
    GitHubProvider({
      // v4 类型要求 string，未配置时回落空串——OAuth 握手会在运行期失败并把错露出来
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  // 会话寿命从 v4 默认的 30 天收到 12 小时：换 NEXTAUTH_SECRET 仍是唯一的即时吊销手段
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  callbacks: {
    // 认领/建号跑在首次登录的 jwt 回调里（v4 的 authorize 是 provider 配置项、不属于 AuthOptions；
    // GitHub 的 profile 会作为 user 并入 token，后续刷新只带 token——这段逻辑天然只在首次登录执行一次）：
    // 先按 githubId 查（已认领的账号），再按 handle 查（无 githubId 的旧账号），查不到才新建——
    // zhanglei 的 12 篇存量日志因此保留在旧账号下；查到了但缺 githubId 则当场绑定（幂等）
    async jwt({ token, user, account }) {
      if (user && account?.provider === "github") {
        adviseConfiguration();

        const profile = user as unknown as {
          id: number;
          login: string;
          email?: string | null;
          name?: string | null;
        };

        if (profile.id && profile.login) {
          const githubId = String(profile.id);

          let found = await db.user.findFirst({ where: { githubId } });

          if (!found) {
            found = await db.user.findFirst({ where: { handle: profile.login } });
          }

          let row = found;

          if (!row) {
            row = await db.user.create({
              data: {
                handle: profile.login,
                email: profile.email ?? null,
                name: profile.name ?? null,
              },
            });
          } else if (!row.githubId) {
            row = await db.user.update({
              where: { id: row.id },
              data: { githubId },
            });
          }

          token.userId = row.id;
        }
      }

      return token;
    },
    // 把同一个 userId 带到会话对象上，Server Action 才不必再造第二套口径
    session({ session, token }) {
      Object.assign(session, { userId: token.userId });

      return session;
    },
  },
};

// 写动作与后台布局唯一该用的会话判定：4-B 起 /admin 是个人控制台，
// 判据从管理员标记改为 userId 存在性——完成 GitHub 登录的账号进自己的后台
export type ConsoleSession = Session & { userId: string };

export async function requireAdminSession(): Promise<ConsoleSession | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  const userId = (session as { userId?: unknown }).userId;

  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  return session as ConsoleSession;
}
