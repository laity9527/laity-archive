/**
 * 文件：prisma.config.ts
 * 描述：Prisma 7 CLI 配置：schema、迁移目录、种子命令与数据源 URL（连接串不再写在 schema 里）
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（Prisma 7 升级，负责人批准）。7.x 禁止 schema 内写 datasource url，
 *               连接串改由本文件经 dotenv 从 .env 读取，只供 CLI 迁移/校验使用；
 *               应用运行时另用 @prisma/adapter-pg 在 src/lib/db.ts 注入连接
 *
 * 为什么 URL 放在这里：Prisma 7 把“CLI 迁移连接”与“应用运行时连接”拆成两条路径；
 * schema 只描述模型，凭据不落 schema 文件；运行时用驱动适配器，便于连接池与测试替换。
 * 本文件只被 prisma CLI 加载（generate / migrate / studio），不进 Next 构建产物。
 * 软著材料把本文件放折走段：它是配置壳，真正的数据模型在 schema.prisma、运行时连接在 db.ts。
 */
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
