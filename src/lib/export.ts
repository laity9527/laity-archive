/**
 * 文件：src/lib/export.ts
 * 描述：全站数据导出纯函数：把 Project/Log 行组装成确定性排序的导出 payload（JSON 序列化与响应在动作层）
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F25 全站数据导出 Commit 3）。零依赖纯数据组装：排序确定性进函数（测试钉住），
 *               counts 统计、exportedAt 的 ISO 化、字段透传都不碰数据库与第三方库；
 *               输入是 DAL 查出的 plain objects，输出是 plain object，node --test 直测
 */

// 与 prisma/schema.prisma 的 Project 模型逐字段对齐（字段集一致即编译通过，不引 Prisma 类型避免动作层耦合）
export type ExportableProject = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  summary: string | null;
  repoUrl: string | null;
  userId: string | null;
  createdAt: Date;
};

// 与 Log 模型逐字段对齐：含草稿（导出是备份语义）、contentHash、sourceCommitSha、isAiAssisted 等全部字段
export type ExportableLog = {
  id: string;
  title: string;
  slug: string;
  projectId: string;
  userId: string | null;
  tags: string[];
  beforeContent: string;
  afterContent: string | null;
  beforeDate: Date;
  afterDate: Date | null;
  isPublished: boolean;
  lessonLearned: string | null;
  publishedAt: Date | null;
  contentHash: string | null;
  sourceCommitSha: string | null;
  isAiAssisted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExportPayload = {
  meta: {
    app: string;
    version: string;
    // ISO 字符串——JSON 序列化后是字符串，纯函数先转好，动作层不再处理时间
    exportedAt: string;
    counts: {
      projects: number;
      logs: number;
      published: number;
      drafts: number;
    };
  };
  user: { handle: string };
  projects: ExportableProject[];
  logs: ExportableLog[];
};

const APP_NAME = "Laity 项目档案库";
// 与 package.json 的 version 保持一致，发版时同步；纯函数不读 package.json（避免 JSON 模块解析进构建面）
const APP_VERSION = "0.1.0";

export function buildExportPayload(input: {
  projects: ExportableProject[];
  logs: ExportableLog[];
  handle: string;
  exportedAt: Date;
}): ExportPayload {
  const { projects, logs, handle, exportedAt } = input;
  const published = logs.filter((log) => log.isPublished).length;

  return {
    meta: {
      app: APP_NAME,
      version: APP_VERSION,
      exportedAt: exportedAt.toISOString(),
      counts: {
        projects: projects.length,
        logs: logs.length,
        published,
        drafts: logs.length - published,
      },
    },
    user: { handle },
    // 确定性排序进纯函数（测试钉住）：导出文件内容不随查询顺序漂移；
    // 先拷贝再排，不改动调用方传进来的对象
    projects: [...projects].sort((a, b) =>
      a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
    ),
    logs: [...logs].sort((a, b) => b.beforeDate.getTime() - a.beforeDate.getTime()),
  };
}
