/**
 * 文件：src/app/api/verify/[hash]/route.ts
 * 描述：公开核验接口：按内容摘要反查已发布版本，返回版本信息与规范化规则文本；
 *       不返回正文、不返回草稿/未发布内容，哈希形态非法与无命中分别回 VAL_001 / VERIFY_001
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: hash 形态校验改走 isContentHash（单源）
 * - 2026-11-18: 初始创建（V5 Phase 1，契约见 docs/openapi.yaml）。错误文案经 error-text.ts 单源；
 *               响应头 no-store + noindex，不进任何缓存
 */
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { errorTextOf } from "@/lib/error-text";
import { getPublishedRevisionByHash } from "@/lib/logs";
import { isContentHash, CANONICAL_RULES_TEXT } from "@/lib/canonical-hash";

export const instant = false;

type VerifyRouteProps = {
  params: Promise<{ hash: string }>;
};

export async function GET(_request: Request, { params }: VerifyRouteProps) {
  await connection();
  const { hash } = await params;

  if (!isContentHash(hash)) {
    return NextResponse.json(
      { ok: false, error: { code: "VAL_001", message: errorTextOf("VAL_001", "log") } },
      { status: 400, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
    );
  }

  const revision = await getPublishedRevisionByHash(hash);

  if (!revision) {
    return NextResponse.json(
      { ok: false, error: { code: "VERIFY_001", message: errorTextOf("VERIFY_001") } },
      { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        slug: revision.trace.slug,
        version: revision.version,
        hashVersion: revision.hashVersion,
        publishedAt: revision.publishedAt.toISOString(),
        gitSha: revision.gitSha,
        gitTag: revision.gitTag,
        canonicalRules: CANONICAL_RULES_TEXT,
      },
    },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}