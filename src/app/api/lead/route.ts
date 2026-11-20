/**
 * 文件：src/app/api/lead/route.ts
 * 描述：公开线索提交接口：内存限流（单 IP 5 分钟 1 次）→ 字段校验 → 入库（ip 只存哈希）→ 审计；
 *       成功只回 {ok:true}，不返回任何敏感信息
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.4，契约见 docs/openapi.yaml LEAD_001）。
 * - 2026-11-19: V5 Phase 2 收尾自检（负责人确认补齐②）：蜜罐 website 非空即静默成功不入库；
 *               最短填写时长 <3s 拒收（LEAD_005）。nginx 边缘限流为第一层双保险（deploy/nginx.conf）。
 *               失败码 LEAD_001（限流 429，带 Retry-After）/ LEAD_002（校验 400）经 error-text.ts 单源
 */
import { NextResponse } from "next/server";
import { computeIpHash, createLead } from "@/lib/lead-admin";
import { errorTextOf } from "@/lib/error-text";
import { checkLeadRateLimit } from "@/lib/lead-rate-limit";
import { leadAntiSpam, validateLeadInput, type LeadInput } from "@/lib/lead-validate";

function clientIp(request: Request): string {
  // X-Forwarded-For 由 nginx 在边缘用 $remote_addr 覆写（防伪造）；取不到时回落未知键
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return (first || "unknown").slice(0, 64);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (Partial<LeadInput> & { website?: string; renderedAt?: number })
    | null;
  const ip = clientIp(request);

  const rate = checkLeadRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "LEAD_001", message: errorTextOf("LEAD_001") } },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000))) },
      },
    );
  }

  // 蜜罐与最短填写时长：蜜罐命中静默成功（不写库不提示差异），过快拒收
  const spam = leadAntiSpam({
    website: String(body?.website ?? ""),
    renderedAt: Number(body?.renderedAt ?? 0),
    now: Date.now(),
  });

  if (spam.verdict === "silent") {
    return NextResponse.json({ ok: true });
  }

  if (spam.verdict === "too_fast") {
    return NextResponse.json(
      { ok: false, error: { code: "LEAD_005", message: errorTextOf("LEAD_005") } },
      { status: 400 },
    );
  }

  const input: LeadInput = {
    name: String(body?.name ?? ""),
    email: String(body?.email ?? ""),
    reqType: String(body?.reqType ?? ""),
    evidenceReq: String(body?.evidenceReq ?? ""),
    message: String(body?.message ?? ""),
  };

  const validation = validateLeadInput(input);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "LEAD_002", message: errorTextOf("LEAD_002") } },
      { status: 400 },
    );
  }

  const ua = request.headers.get("user-agent")?.slice(0, 200) ?? null;
  const result = await createLead(input, computeIpHash(ip), ua);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "LEAD_002", message: errorTextOf("LEAD_002") } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
