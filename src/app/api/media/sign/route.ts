/**
 * 文件：src/app/api/media/sign/route.ts
 * 描述：媒体上传签名接口：扩展名白名单 + 声明大小预检 → 生成服务端对象键 → 返回 OSS PUT 签名直传地址；
 *       后端只做签名与校验，不接收文件内容
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.2）。对象键落 logs/media/ 前缀（与既有 RAM 策略
 *               logs/* 一致，不新增云侧策略变更）；签名仅对服务端生成的键，不信任上传文件名
 * - 2026-11-19: 类型/大小预检前置到会话判定之前——拒绝非法类型不泄露信息，合法类型仍须管理员会话才发签名
 * - 2026-11-19: 收尾自检：OSS 客户端构造包 try/catch 转 500 信封（此前裸抛）；签发动作记 media.sign 审计
 */
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/auth";
import { errorTextOf } from "@/lib/error-text";
import { isObjectKeySafe } from "@/lib/object-key";
import { MEDIA_MAX_BYTES, isAllowedMediaFile } from "@/lib/media-whitelist";
import { createOssClient } from "@/lib/oss";
import { recordAudit } from "@/lib/audit";
import { mediaAuditEntry } from "@/lib/media-whitelist";

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function fail(code: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message: errorTextOf(code) } },
    { status },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { fileName?: string; declaredSize?: number }
    | null;
  const fileName = String(body?.fileName ?? "").trim();
  const declaredSize = Number(body?.declaredSize ?? 0);

  // 类型与大小预检放在会话判定之前：拒绝非法类型不泄露任何信息，
  // 合法类型仍要过管理员会话才给签名（签名不外发）
  if (!fileName || !isAllowedMediaFile(fileName)) {
    return fail("MEDIA_001", 400);
  }

  if (declaredSize > MEDIA_MAX_BYTES) {
    return fail("MEDIA_002", 400);
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_001", message: errorTextOf("AUTH_001") } },
      { status: 401 },
    );
  }

  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const key = `logs/media/${now.getUTCFullYear()}-${month}/${stamp}-${randomBytes(6).toString("hex")}.${extOf(fileName)}`;

  if (!isObjectKeySafe(key)) {
    return fail("MEDIA_003", 500);
  }

  // OSS 凭据缺失时 createOssClient 会抛错：包住转成 500 信封，不让裸堆栈出接口
  let uploadUrl: string;
  try {
    const client = createOssClient();
    uploadUrl = client.signatureUrl(key, { method: "PUT", expires: 300 });
  } catch (error) {
    console.error("MEDIA_SIGN_OSS_ERROR", error instanceof Error ? error.message : String(error));
    return fail("MEDIA_003", 500);
  }

  // 签发审计：记录对象键与原始名（不含内容），签名过期重签会留下多次记录
  await recordAudit(
    mediaAuditEntry(session.userId, "media.sign", { id: key }, { fileName, ossKey: key }),
  );

  return NextResponse.json({ ok: true, data: { ossKey: key, uploadUrl } });
}
