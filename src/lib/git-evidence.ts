/**
 * 文件：src/lib/git-evidence.ts
 * 描述：V5 Phase 1 Git 时间锚入口：发布事务提交后异步把轨迹版本的规范化 md 推到存证仓库
 *       （Contents API PUT），并打 trace/<slug>/v<N> 标签（Refs API）；
 *       失败只返回原因不抛错——发布已成功，gitSha 留 null 即"待锚定"降级态，可后台重试
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建。零新增依赖：原生 fetch 直调 GitHub API；token 经 token-crypto.ts
 *               解密（AES-256-GCM，明文不落库不进日志）；正文用 canonical-hash.ts 的规范化口径；
 *               GIT_EVIDENCE_ENABLED=false 整体关闭，EVIDENCE_REPO 缺失时跳过并报原因
 * - 2026-11-18: 网络层与纯函数拆到 src/lib/git-anchor.ts（本文件只剩取数 + 解密 + 委托），
 *               路径/标签/md 格式与降级行为由 tests/git-anchor.test.ts 直接钉住
 */
import { db } from "@/lib/db";
import {
  anchorGitEvidenceWithToken,
  type GitAnchorInput,
  type GitAnchorResult,
} from "@/lib/git-anchor";
import { decryptToken } from "@/lib/token-crypto";

export type { GitAnchorInput, GitAnchorResult } from "@/lib/git-anchor";

export async function anchorGitEvidence(input: GitAnchorInput): Promise<GitAnchorResult> {
  if (process.env.GIT_EVIDENCE_ENABLED === "false") {
    return { ok: false, reason: "GIT_EVIDENCE_ENABLED=false，锚定整体关闭" };
  }

  const repo = process.env.EVIDENCE_REPO?.trim();
  if (!repo) {
    return { ok: false, reason: "EVIDENCE_REPO 未配置" };
  }

  const user = await db.user.findFirst({
    where: { id: input.userId },
    select: { githubAccessToken: true },
  });

  if (!user?.githubAccessToken) {
    return { ok: false, reason: "账号未绑定 GitHub 授权（无 token）" };
  }

  let token: string;
  try {
    token = decryptToken(user.githubAccessToken);
  } catch {
    return { ok: false, reason: "token 解密失败" };
  }

  return anchorGitEvidenceWithToken(input, repo, token);
}

/** 发布事务提交后触发锚定：吞掉一切异常只记日志，锚定失败不影响发布成功 */
export async function runGitAnchorQuietly(input: GitAnchorInput): Promise<void> {
  try {
    const result = await anchorGitEvidence(input);
    if (!result.ok) {
      console.error(`[git-evidence] 锚定未完成（${input.trace.slug} v${input.version}）：${result.reason}`);
    }
  } catch (error) {
    console.error(
      `[git-evidence] 锚定异常（${input.trace.slug} v${input.version}）：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
