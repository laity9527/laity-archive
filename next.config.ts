/**
 * 文件：next.config.ts
 * 描述：Next 配置：Cache Components + 局部预取、Tailwind Turbopack 规则、standalone 产物（D6 批准，供 Docker 精简镜像）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 脚手架创建
 * - 2026-10-30: Phase 6 加 output: "standalone"（D6 批准的配置变更，仅这一项）
 * - 2026-11-02: Phase 5b 加 serverExternalPackages: ["ali-oss"]（经我批准，见 I022）
 * - 2026-11-02: 加 serverActions.bodySizeLimit: "6mb"（经我批准；默认 1MB 会让 >1MB 的图根本进不到 IMG_001 校验）
 * - 2026-11-05: 加 CSP 头与 poweredByHeader: false（第七轮"上线合规面"量出缺失后经授权加；nonce 方案
 *               与 cacheComponents 的 PPR 不兼容——静态壳拿不到 nonce，故按官方"Without Nonces"
 *               路径用静态头：script/style 仍需 unsafe-inline，但 object-src/frame-ancestors/
 *               base-uri/form-action 全部卡死；img-src 放行 https: 是因为正文图片走 OSS 直链，域名随桶走）
 */
import type { NextConfig } from "next";

// dev 要 unsafe-eval（React 调试栈用 eval，官方文档明示），生产不要；
// upgrade-insecure-requests 会把 http 子资源改写成 https，http 直连的 dev 会自断，只进生产
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // D6：多阶段构建的 run 阶段只带 standalone 产物，不再装 node_modules
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // 不再透传 X-Powered-By: Next.js（指纹信息，无功能价值）
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
  // I022：ali-oss 的依赖 urllib 里有懒加载 require('proxy-agent')，打进 Server bundle 会静态解析失败，
  // 故排除出打包，运行时用原生 require
  serverExternalPackages: ["ali-oss"],
  // SPEC IMG_001 允许单图 ≤5MB，框架默认 1MB 会把大图先拒在动作之外且不给 IMG_001；
  // 6mb 与 deploy/nginx.conf 的 client_max_body_size 6m 配套（留 1MB 余量）
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
