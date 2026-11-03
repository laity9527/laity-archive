/**
 * 文件：src/app/api/health/route.ts
 * 描述：运维健康检查端点：只回答"进程活着 + 数据库连得上吗"，不输出任何内部信息
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建。此前容器的健康探针打的是 /login 页面，只能证明进程活着，证明不了数据库可用
 */
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  // Cache Components 下这条路由必须请求期执行，否则会走预渲染
  await connection();

  let dbReachable = true;

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    // 不外泄异常内容：错误文本里会有连接串与主机信息
    dbReachable = false;
  }

  return NextResponse.json(
    { status: dbReachable ? "ok" : "degraded", db: dbReachable },
    {
      status: dbReachable ? 200 : 503,
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
    },
  );
}
