/**
 * 文件：next.config.ts
 * 描述：Next 配置：Cache Components + 局部预取、Tailwind Turbopack 规则、standalone 产物（D6 批准，供 Docker 精简镜像）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 脚手架创建
 * - 2026-10-30: Phase 6 加 output: "standalone"（D6 批准的配置变更，仅这一项）
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // D6：多阶段构建的 run 阶段只带 standalone 产物，不再装 node_modules
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
