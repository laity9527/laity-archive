/**
 * 文件：src/app/admin/export/route.ts
 * 描述：全站数据导出路由处理器：会话校验→查当前账号全部 Project/Log→组装 payload→JSON 下载响应
 * 作者：张磊
 * 创建日期：2026-11-12
 * 修改记录：
 * - 2026-11-12: 初始创建（F25 全站数据导出 Commit 4 收口）。原方案为 Server Action 返回 Response，
 *               实测动作返回值走 RSC 序列化通道（只收纯对象，Response 是类实例进不了）被框架拒绝，
 *               按官方文档下载范例改用 Route Handler——Content-Disposition 是真实响应头驱动下载；
 *               where 带 userId 复合条件（D33 口径），User 只 select handle，导出面不触加密 token 列
 */
import { requireAdminSession } from "@/auth";
import { db } from "@/lib/db";
import { buildExportPayload } from "@/lib/export";

export async function GET() {
  const session = await requireAdminSession();

  if (!session) {
    // API 请求走 401 比 redirect 更标准——浏览器下载场景下 redirect 会打断响应
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.userId;

  try {
    // handle 是公开标识，只取这一列；会话里不带 handle（jwt 载荷只有 userId）
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { handle: true },
    });

    const [projects, logs] = await Promise.all([
      db.project.findMany({ where: { userId } }),
      db.log.findMany({ where: { userId } }),
    ]);

    const payload = buildExportPayload({
      projects,
      logs,
      handle: user?.handle ?? "",
      exportedAt: new Date(),
    });

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="laity-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // 查库或组装异常返回 500 + 错误码，客户端下载失败时据此提示（EXPORT_001 文案在 error-text 表）
    return new Response(JSON.stringify({ error: "EXPORT_001" }), { status: 500 });
  }
}
