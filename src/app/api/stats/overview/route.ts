/**
 * 文件：src/app/api/stats/overview/route.ts
 * 描述：管理员只读统计接口：返回线索/媒体/访问计数的聚合快照（契约见 docs/openapi.yaml）；
 *       鉴权复用 requireAdminSession，无会话 401；响应只含计数，不含任何线索或媒体明细
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（Phase 3 任务 2）。loadStats 为纯读口径（七条 count/groupBy +
 *               内存计数快照），响应 no-store
 */
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { errorTextOf } from "@/lib/error-text";
import { loadStats } from "@/lib/stats-admin";

export const instant = false;

export async function GET() {
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_001", message: errorTextOf("AUTH_001") } },
      { status: 401 },
    );
  }

  const stats = await loadStats();

  return NextResponse.json(
    { ok: true, data: stats },
    { headers: { "Cache-Control": "no-store" } },
  );
}
