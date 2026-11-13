/**
 * 文件：src/app/admin/ai-actions.ts
 * 描述：AI 辅助生成（Step 6 / F22）Server Action：会话校验 → 从表单取 title / BEFORE / AFTER →
 *      提取 Commit 列表（超 AI_MAX_COMMITS 返回 AI_002）→ buildPrompt → generateAiDraft →
 *      parseAiResponse；请求失败或解析失败统一降级 AI_001，不阻塞保存/发布主流程。
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（Step 6 Commit 2）
 * - 2026-11-13: 把笼统的 AI_001 拆开：AI_003 未配置密钥 / AI_004 上游失败或超时 /
 *               AI_005 返回无法解析 / AI_006 正文没有提交列表；失败原因写服务端日志（不回显密钥）
 */
"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { AiError, generateAiDraft } from "@/lib/ai-client";
import { AI_MAX_COMMITS, buildContextPrompt, buildPrompt, extractCommits, parseAiResponse } from "@/lib/ai-prompt";

export type AiDraftActionResult =
  | { ok: true; data: { beforeContent: string; afterContent: string } }
  | {
      ok: false;
      code: "AI_001" | "AI_002" | "AI_003" | "AI_004" | "AI_005" | "AI_006";
    };

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

// 同步草稿的标题形如「<仓库名> · <月>月<日>日 · <N> 条提交」——仓库名可从标题提取；
// 其它场景用固定占位（仓库名只用于 prompt 行文，不参与任何校验）
function repoNameFromTitle(title: string): string {
  const head = title.split(" · ")[0].trim();

  return head.length > 0 ? head : "GitHub 同步";
}

export async function generateAiDraftAction(formData: FormData): Promise<AiDraftActionResult> {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const title = readText(formData.get("title"));
  const beforeContent = readText(formData.get("beforeContent"));
  const afterContent = readText(formData.get("afterContent"));

  // Commit 列表由 GitHub 同步写在 AFTER（"- 消息" 行），BEFORE 里混着的概率性出现
  const commits = [...extractCommits(afterContent), ...extractCommits(beforeContent)];

  if (commits.length > AI_MAX_COMMITS) {
    return { ok: false, code: "AI_002" };
  }

  if (commits.length === 0) {
    // 没有 Commit 列表并不等于不能用：普通日志按标题与现有正文续写；
    // 但标题与两段正文全空时，没有任何可依据的事实，直接拒绝
    const hasContext = Boolean(
      title.trim() || beforeContent.trim() || afterContent.trim(),
    );

    if (!hasContext) {
      return { ok: false, code: "AI_006" };
    }
  }

  const prompt =
    commits.length > 0
      ? buildPrompt(commits, repoNameFromTitle(title))
      : buildContextPrompt({ title, beforeContent, afterContent });

  try {
    const raw = await generateAiDraft(prompt);
    const draft = parseAiResponse(raw);

    // 失败不重试：调用方（编辑器）降级为横幅提示，正文保持现状
    if (!draft) {
      console.error("[ai] 返回无法解析：", raw.slice(0, 200));
      return { ok: false, code: "AI_005" };
    }

    return { ok: true, data: draft };
  } catch (error) {
    if (error instanceof AiError) {
      console.error(`[ai] ${error.kind}：${error.message}`);

      if (error.kind === "config") {
        return { ok: false, code: "AI_003" };
      }

      if (error.kind === "empty") {
        return { ok: false, code: "AI_005" };
      }

      return { ok: false, code: "AI_004" };
    }

    console.error("[ai] 未知错误：", error);
    return { ok: false, code: "AI_001" };
  }
}
