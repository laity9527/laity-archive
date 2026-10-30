/**
 * 文件：prisma/seed.ts
 * 描述：开发种子数据：1 个项目 + 1 条已发布日志，供 Phase 1 闭环验证
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { slug: "earth-mirror" },
    update: {},
    create: {
      slug: "earth-mirror",
      name: "地球 Mirror",
      kind: "product",
      status: "WIP",
      summary: "把地球档案做成可浏览的产品。",
    },
  });

  await prisma.log.upsert({
    where: { slug: "prebuild-index" },
    update: {},
    create: {
      title: "决定放弃本地搜索，改用索引预构建",
      slug: "prebuild-index",
      projectId: project.id,
      tags: ["需求判断", "踩坑"],
      beforeContent: "构建耗时从 3.2s 涨到 11.8s，计划改为构建期预生成索引。",
      afterContent: "预构建后首次打开 1.1s，构建期多 4s，可接受。",
      beforeDate: new Date("2026-03-12T06:02:11Z"),
      afterDate: new Date("2026-03-12T07:47:33Z"),
      isPublished: true,
      lessonLearned: "用构建期成本换首次打开速度。",
      publishedAt: new Date("2026-03-12T08:00:00Z"),
    },
  });

  console.log("seed 完成：1 个 Project，1 条已发布 Log");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });