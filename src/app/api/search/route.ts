/**
 * 文件：src/app/api/search/route.ts
 * 描述：命令面板的搜索接口：一次返回日志 / 项目 / 标签三组候选，只读、无凭据、结果限流在查询层
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B4）。面板需要跨实体即时搜索，页面内 Server Action
 *               不适合"输入即查"；这里用 Route Handler 返回 JSON，日志复用 searchLogsLimited
 *               （isPublished 口径 + 50 条上限），项目与标签各取少量；响应 no-store，不缓存
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTagIndex, searchLogsLimited } from "@/lib/logs";

const EMPTY = { logs: [], projects: [], tags: [] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  // 空查询直接回空：面板在输入框为空时不该展示任何"全站内容"
  if (q.length === 0) {
    return NextResponse.json(EMPTY, { headers: { "cache-control": "no-store" } });
  }

  // 上限与表单 LIMITS 同量级：搜索词过长没有意义，也避免把病态输入送进 ILIKE
  if (q.length > 80) {
    return NextResponse.json(
      { error: "SEARCH_001" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const [logPage, projectRows, tagIndex] = await Promise.all([
    searchLogsLimited({ q, take: 6 }),
    db.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: {
        slug: true,
        name: true,
        user: { select: { handle: true } },
      },
      take: 8,
    }),
    getTagIndex(),
  ]);

  const needle = q.toLowerCase();
  const projects = projectRows
    .filter((row): row is typeof row & { user: { handle: string } } => row.user !== null)
    .slice(0, 4)
    .map((row) => ({ name: row.name, slug: row.slug, handle: row.user.handle }));

  const tags = tagIndex
    .filter((item) => item.tag.toLowerCase().includes(needle))
    .slice(0, 6);

  return NextResponse.json(
    {
      logs: logPage.items.map((item) => ({
        title: item.title,
        slug: item.slug,
        handle: item.user.handle,
        project: item.project.name,
      })),
      projects,
      tags,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
