/**
 * 文件：src/lib/audit.ts
 * 描述：审计写入与读取：只记谁/何时/对哪条对象做了什么，不存正文、token 或密钥
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（V4 P3 §7.7）。recordAudit 尽力而为：主动作成功后调用，
 *               写失败只 console.error，不把审计故障升级成业务失败；meta 只放非敏感摘要。
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Prisma.InputJsonValue;
};

/** 审计写入：失败不阻塞主动作，也不回滚已完成的业务写入 */
export async function recordAudit(input: AuditInput) {
  try {
    await db.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ...(input.meta ? { meta: input.meta } : {}),
      },
    });
  } catch (error) {
    console.error(
      "AUDIT_WRITE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** 审计列表：最新 100 条，可按 action 过滤；只读 */
export async function listAuditEvents(action?: string) {
  return db.auditEvent.findMany({
    where: action ? { action } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

/** 已知动作的中文标签；未知动作原样显示，不隐藏 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "log.publish": "发布日志",
  "log.unpublish": "下架日志",
  "log.delete": "删除日志",
  "project.create": "新建项目",
  "project.update": "更新项目",
  "project.delete": "删除项目",
  "preview.create": "生成预览链接",
  "preview.revoke": "撤销预览链接",
  "export.run": "导出数据",
};
