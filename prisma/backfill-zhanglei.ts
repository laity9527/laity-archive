/**
 * 文件：prisma/backfill-zhanglei.ts
 * 描述：V2.0 Step 1 存量数据回填：建初始 admin 用户（handle zhanglei），把既有 Project/Log 归属给它
 * 作者：张磊
 * 创建日期：2026-11-09
 * 修改记录：
 * - 2026-11-09: 初始创建。幂等可重跑：先按 handle upsert 用户再按空归属回填，末尾断言两表都无 null，
 *               否则抛错退出（迁移/脚本失败宁可停下来，也不许带着 null 归属继续）。
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const HANDLE = "zhanglei";

async function main() {
  const admin = await db.user.upsert({
    where: { handle: HANDLE },
    create: {
      handle: HANDLE,
      // 单口令登录的会话语义移交 V2 的 User 携带的 id；本字段留空，登录模型在 Step 2 裁定
      name: "张磊",
      email: null,
      isAdmin: true,
    },
    update: {},
  });

  const [projects, logs] = await Promise.all([
    db.project.updateMany({ where: { userId: null }, data: { userId: admin.id } }),
    db.log.updateMany({ where: { userId: null }, data: { userId: admin.id } }),
  ]);

  const [stillUnassignedProjects, stillUnassignedLogs] = await Promise.all([
    db.project.count({ where: { userId: null } }),
    db.log.count({ where: { userId: null } }),
  ]);

  if (stillUnassignedProjects > 0 || stillUnassignedLogs > 0) {
    throw new Error(
      `回填校验失败：仍有 ${stillUnassignedProjects} 个项目 / ${stillUnassignedLogs} 条日志没有归属，请先对账`,
    );
  }

  console.log(
    `回填完成：用户 ${admin.id}（handle ${admin.handle}）归属 ${projects.count} 个项目 / ${logs.count} 条日志，校验通过`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
