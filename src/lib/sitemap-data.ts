/**
 * 文件：src/lib/sitemap-data.ts
 * 描述：站点地图取数：公开路由 + 全部已发布日志 + 全部项目，草稿永不进入
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建
 * - 2026-11-03: 公开路由清单加 /privacy（隐私与数据说明页）
 * - 2026-11-03: 公开路由清单加 /licenses（开源许可与致谢页）
 * - 2026-11-05: 公开路由清单加 /about（关于页，SPEC F19 / DESIGN D31；静态页无 lastModified，
 *               与 /privacy、/licenses 同一写法）
 * - 2026-11-09: V2.0 Step 3 阶段二：先查拥有公开资源的用户（有已发布日志或有项目），再按租户生成
 *               /u/[handle]、/u/[handle]/logs/[slug]、/u/[handle]/projects/[slug] 清单；
 *               草稿（isPublished=false）与后台路径一律不进——取数仍走 getSafeLogs/listPublicProjects 的公开白名单
 */
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getSafeLogs } from "@/lib/logs";
import { listPublicProjects } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
};

// 内容随发布动作变化，sitemap 必须请求期取数；Cache Components 下要先用 connection() 声明
// "到这里停止预渲染"，否则构建期会因未缓存查询报错
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  await connection();

  const base = siteUrl();

  // 有公开资源的用户：至少一条已发布日志，或至少一个项目（项目无发布开关，公开范围由字段白名单控制）
  const users = await db.user.findMany({
    where: {
      OR: [
        { logs: { some: { isPublished: true } } },
        { projects: { some: {} } },
      ],
    },
    select: { handle: true, id: true },
  });

  const entries: SitemapEntry[] = [
    { url: `${base}/` },
    { url: `${base}/logs` },
    { url: `${base}/projects` },
    { url: `${base}/privacy` },
    { url: `${base}/licenses` },
    { url: `${base}/about` },
  ];

  for (const user of users) {
    const { handle, id } = user;
    const [logs, projects] = await Promise.all([
      getSafeLogs({ handle }),
      listPublicProjects(id),
    ]);

    entries.push({ url: `${base}/u/${handle}` });

    for (const log of logs) {
      entries.push({
        url: `${base}/u/${handle}/logs/${log.slug}`,
        lastModified: log.updatedAt,
      });
    }

    for (const project of projects) {
      entries.push({
        url: `${base}/u/${handle}/projects/${project.slug}`,
        lastModified: project.createdAt,
      });
    }
  }

  return entries;
}
