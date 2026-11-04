/**
 * 文件：src/lib/projects.ts
 * 描述：项目数据访问：管理侧列表（含日志数）、概览统计、增改删与 PRJ_001/PRJ_002 判定；公开侧列表与按 slug 查询
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: Phase 5a 补 listPublicProjects / getPublicProjectBySlug，只取可公开展示的字段
 * - 2026-11-02: 补 PROJECT_KINDS / PROJECT_STATUSES 单源常量，替掉散在校验与表单里的字面量
 * - 2026-11-02: 补 getArchiveBoard()：首页看板与精选的统一取数口，强制只统计已发布日志且零日志项目也上榜
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// 合法取值与 prisma/schema.prisma 的注释保持一致；改这里要同步改 schema 注释
export const PROJECT_KINDS: string[] = ["product", "tool", "site"];
export const PROJECT_STATUSES: string[] = ["WIP", "LIVE", "ARCHIVED"];

export type ProjectInput = {
  id?: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  summary?: string;
  repoUrl?: string;
};

export type SaveProjectResult =
  | { ok: true; id: string }
  | { ok: false; code: "PRJ_002" | "PRJ_004" };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; code: "PRJ_001" | "PRJ_004" };

// 日志表单里的 projectId 是客户端可控值：不存在的外键会一路走到写入并抛 P2003（500），
// 所以动作层先取一次 id 集合做存在性判定，只取 id 一列
export async function listProjectIds(): Promise<string[]> {
  const rows = await db.project.findMany({ select: { id: true } });

  return rows.map((row) => row.id);
}

export async function listProjects() {
  return db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { logs: true } } },
  });
}

// 项目表没有发布开关，公开范围靠字段白名单控制；日志只统计已发布，避免草稿计数外泄
export async function listPublicProjects() {
  return db.project.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      summary: true,
      repoUrl: true,
      createdAt: true,
      logs: {
        where: { isPublished: true },
        select: { beforeDate: true },
        orderBy: { beforeDate: "desc" },
      },
    },
  });
}

export type ArchiveBoardEntry = {
  name: string;
  slug: string;
  kind: string;
  status: string;
  summary: string | null;
  count: number;
  // 零日志项目没有"最近更新"可展示，用 null 表示，不拿创建时间冒充
  latest: Date | null;
};

// 首页看板与精选的唯一取数口：强制只统计已发布日志，零日志项目也要出现在看板里
export async function getArchiveBoard(): Promise<ArchiveBoardEntry[]> {
  const projects = await db.project.findMany({
    select: {
      name: true,
      slug: true,
      kind: true,
      status: true,
      summary: true,
      createdAt: true,
      logs: {
        where: { isPublished: true },
        select: { beforeDate: true },
        orderBy: { beforeDate: "desc" },
      },
    },
  });

  const rows = projects.map((project) => ({
    name: project.name,
    slug: project.slug,
    kind: project.kind,
    status: project.status,
    summary: project.summary,
    count: project.logs.length,
    latest: project.logs[0]?.beforeDate ?? null,
    createdAt: project.createdAt,
  }));

  rows.sort((a, b) => {
    if (a.latest && b.latest) {
      return b.latest.getTime() - a.latest.getTime();
    }

    if (a.latest) {
      return -1;
    }

    if (b.latest) {
      return 1;
    }

    // 两边都还没发布过日志：按建项时间倒序排在后面
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    status: row.status,
    summary: row.summary,
    count: row.count,
    latest: row.latest,
  }));
}

export async function getPublicProjectBySlug(slug: string) {
  return db.project.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      kind: true,
      status: true,
      summary: true,
      repoUrl: true,
      createdAt: true,
    },
  });
}

export async function getProjectById(id: string) {
  return db.project.findUnique({ where: { id } });
}

// Proxy 前置判定只关心 slug 命中与否，select slug 让这次查询停留在唯一索引层面
export async function isProjectSlug(slug: string) {
  const hit = await db.project.findUnique({
    where: { slug },
    select: { slug: true },
  });

  return hit !== null;
}

export async function getAdminOverview() {
  const [projectCount, publishedCount, draftCount, recentLogs] = await Promise.all([
    db.project.count(),
    db.log.count({ where: { isPublished: true } }),
    db.log.count({ where: { isPublished: false } }),
    db.log.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  return { projectCount, publishedCount, draftCount, recentLogs };
}

export async function saveProject(input: ProjectInput): Promise<SaveProjectResult> {
  const data = {
    slug: input.slug,
    name: input.name,
    kind: input.kind,
    status: input.status,
    summary: input.summary || null,
    repoUrl: input.repoUrl || null,
  };

  try {
    const project = input.id
      ? await db.project.update({ where: { id: input.id }, data })
      : await db.project.create({ data });

    return { ok: true, id: project.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, code: "PRJ_002" };
      }

      // 带着 id 更新却命中 0 行：编辑表单是在别的标签页/更早时刻打开的，那行已经不在了。
      // 原先这里不捕，P2025 直接抛出去变成 500
      if (error.code === "P2025") {
        return { ok: false, code: "PRJ_004" };
      }
    }

    throw error;
  }
}

export async function deleteProject(id: string): Promise<DeleteProjectResult> {
  try {
    await db.project.delete({ where: { id } });

    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003 外键约束：项目下还有日志
      if (error.code === "P2003") {
        return { ok: false, code: "PRJ_001" };
      }

      // P2025 是"没删掉任何行"，不是"已经是删除状态"。返回 ok:true 会让页面显示删除成功，
      // 而列表里那一行可能只是还没刷新——报实错
      if (error.code === "P2025") {
        return { ok: false, code: "PRJ_004" };
      }
    }

    throw error;
  }
}
