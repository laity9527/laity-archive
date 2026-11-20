/**
 * 文件：src/lib/publish-gate.ts
 * 描述：发布闸门与版本自增的纯函数单源：敏感扫描门（LOG_003）、裁决依据门（LOG_005）、版本号自增
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1）。从 publish.ts 抽出，使闸门判定可被 node --test 直接钉住
 *               （publish.ts 内部走 @/ 别名，测试引不到；本文件只走相对路径与包导入）
 *               扫的是将要公开的正文而非表单声称的内容；通过时回出回执用的阻断级命中数
 */
import type { Verdict } from "@prisma/client";
import { hasBlockingHit, scanSensitive } from "./sensitive-scan.ts";

export type PublishGateInput = {
  title: string;
  beforeContent: string;
  afterContent: string | null;
  lessonLearned: string | null;
  sensitiveConfirmed?: boolean;
  verdict: Verdict;
  verdictNote: string | null;
};

export type PublishGateResult =
  | { ok: true; scanHits: number }
  | { ok: false; code: "LOG_003" | "LOG_005" };

/** 发布闸门：未带确认标记遇阻断级命中不放行；裁决为被推翻时必填依据 */
export function evaluatePublishGate(input: PublishGateInput): PublishGateResult {
  const scanText = [input.title, input.beforeContent, input.afterContent, input.lessonLearned]
    .filter(Boolean)
    .join("\n");
  const hits = scanSensitive(scanText);

  if (!input.sensitiveConfirmed && hasBlockingHit(hits)) {
    return { ok: false, code: "LOG_003" };
  }

  if (input.verdict === "OVERTURNED" && !input.verdictNote?.trim()) {
    return { ok: false, code: "LOG_005" };
  }

  const scanHits = hits
    .filter((hit) => !hit.advisory)
    .reduce((sum, hit) => sum + hit.count, 0);

  return { ok: true, scanHits };
}

/** 版本号自增：从现存最大值 +1；无版本行时首版为 1（V5 Phase 1 发布产版本行） */
export function nextRevisionVersion(maxVersion: number | null): number {
  return (maxVersion ?? 0) + 1;
}
