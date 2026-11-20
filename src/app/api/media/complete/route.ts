/**
 * 文件：src/app/api/media/complete/route.ts
 * 描述：媒体上传完成接口：从 OSS 取回对象，复算大小上限、内容签名与扩展名一致性，
 *       全部通过才登记 Media 行（写审计）；任一校验不过即拒收并尽力清理 OSS 对象
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.2）。类型判定不信任浏览器上报的 MIME，
 *               以内容签名为准（与日志插图链路同口径）
 * - 2026-11-19: 收尾自检：OSS 客户端构造包 try/catch 转 500 信封；两条拒收路径（超限/内容不符）
 *               记 media.reject 审计；登记失败时清理 OSS 对象，不留无登记的孤儿文件
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/auth";
import { createMedia } from "@/lib/media-admin";
import { errorTextOf } from "@/lib/error-text";
import { isObjectKeySafe } from "@/lib/object-key";
import {
  MEDIA_MAX_BYTES,
  mediaContentMatchesExtension,
} from "@/lib/media-whitelist";
import { createOssClient } from "@/lib/oss";
import { recordAudit } from "@/lib/audit";
import { mediaAuditEntry } from "@/lib/media-whitelist";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
};

function fail(code: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message: errorTextOf(code) } },
    { status },
  );
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_001", message: errorTextOf("AUTH_001") } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { ossKey?: string; originalName?: string }
    | null;
  const ossKey = String(body?.ossKey ?? "").trim();

  if (!ossKey || !isObjectKeySafe(ossKey) || !ossKey.startsWith("logs/media/")) {
    return fail("MEDIA_003", 400);
  }

  const fileName = ossKey.slice(ossKey.lastIndexOf("/") + 1);
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";

  // OSS 客户端构造与取回都包住：凭据缺失/网络异常转成信封错误，不让裸堆栈出接口
  let client: ReturnType<typeof createOssClient>;
  try {
    client = createOssClient();
  } catch (error) {
    console.error("MEDIA_COMPLETE_OSS_ERROR", error instanceof Error ? error.message : String(error));
    return fail("MEDIA_003", 500);
  }

  // 先量实际大小：超限直接拒收并清理对象，不把大文件拉进内存
  let size: number;
  try {
    const head = await client.head(ossKey);
    size = Number((head.res.headers as Record<string, string | undefined>)["content-length"] ?? 0);
  } catch {
    return fail("MEDIA_003", 404);
  }

  if (size <= 0 || size > MEDIA_MAX_BYTES) {
    await client.delete(ossKey).catch(() => undefined);
    await recordAudit(mediaAuditEntry(session.userId, "media.reject", { id: ossKey }, { reason: "size", size }));
    return fail("MEDIA_002", 400);
  }

  let content: Buffer;
  try {
    content = (await client.get(ossKey)).content as Buffer;
  } catch {
    return fail("MEDIA_003", 404);
  }

  const hash = createHash("sha256").update(content).digest("hex");

  if (!mediaContentMatchesExtension(fileName, content)) {
    await client.delete(ossKey).catch(() => undefined);
    await recordAudit(mediaAuditEntry(session.userId, "media.reject", { id: ossKey }, { reason: "content_mismatch", fileName }));
    return fail("MEDIA_002", 400);
  }

  const region = process.env.OSS_REGION ?? "";
  const bucket = process.env.OSS_BUCKET ?? "";
  const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`;

  const result = await createMedia(
    {
      fileName,
      originalName: String(body?.originalName ?? "").trim(),
      ossKey,
      ossUrl,
      mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream",
      size,
      hash,
    },
    session.userId,
  );

  if (!result.ok) {
    // 登记失败（如键冲突）：OSS 对象一并清理，避免留下无登记的孤儿文件
    await client.delete(ossKey).catch(() => undefined);
    return fail(result.code, 400);
  }

  return NextResponse.json({ ok: true, data: { id: result.id, ossUrl } });
}
