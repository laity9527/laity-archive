/**
 * 文件：src/lib/dev-login.ts
 * 描述：本地开发用的临时账号密码校验（纯函数）：只在非 production 且配置了 DEV_LOGIN_PASSWORD 时启用
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。GitHub OAuth 暂时登录失败时的本地兜底；不在源码里写死口令，
 *               生产构建（NODE_ENV=production）一律不启用，避免把调试入口带上线。
 */

export function isDevLoginEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.NODE_ENV !== "production" &&
    typeof env.DEV_LOGIN_PASSWORD === "string" &&
    env.DEV_LOGIN_PASSWORD.length > 0
  );
}

export function verifyDevCredentials(
  username: string,
  password: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!isDevLoginEnabled(env)) {
    return false;
  }

  const expectedUser =
    typeof env.DEV_LOGIN_USER === "string" && env.DEV_LOGIN_USER.trim().length > 0
      ? env.DEV_LOGIN_USER.trim()
      : "admin";

  return username === expectedUser && password === env.DEV_LOGIN_PASSWORD;
}
