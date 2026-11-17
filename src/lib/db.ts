/**
 * 文件：src/lib/db.ts
 * 描述：PrismaClient 单例（开发环境走 globalThis，避免热更新重复建连接）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-17: Prisma 7 升级（负责人批准）：客户端不再自带查询引擎，改为注入 @prisma/adapter-pg；
 *               连接串仍只来自 DATABASE_URL，不在代码里拼接或回退到字面量
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 缺失：Prisma 7 需要驱动适配器连接字符串");
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;