/**
 * 文件：src/lib/projects.ts
 * 描述：管理侧项目数据访问：列表（含日志数）、概览统计、增改删与 PRJ_001/PRJ_002 判定
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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
  | { ok: false; code: "PRJ_002" };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; code: "PRJ_001" };

export async function listProjects() {
  return db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { logs: true } } },
  });
}

export async function getProjectById(id: string) {
  return db.project.findUnique({ where: { id } });
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, code: "PRJ_002" };
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
      // P2003 外键约束：项目下还有日志；P2025 记录不存在视为已删除
      if (error.code === "P2003") {
        return { ok: false, code: "PRJ_001" };
      }

      if (error.code === "P2025") {
        return { ok: true };
      }
    }

    throw error;
  }
}
