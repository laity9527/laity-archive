/**
 * 文件：src/app/admin/sync-actions.ts
 * 描述：GitHub 同步 Server Action：会话→解密 token→拉 commits→过滤→虚拟项目 upsert→草稿落库
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 2）。全部写路径带 session.userId；token 只在服务端解密，不回传
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/auth";
import { db } from "@/lib/db";
import { decryptToken } from "@/lib/token-crypto";
import { fetchAllCommits, fetchUserLogin, fetchSyncRepos, SyncError } from "@/lib/github-sync";
import { buildDraft, filterCommits, groupByRepoDay } from "@/lib/github-sync-filter";
import { saveLog } from "@/lib/publish";

// 虚拟项目标识：同步草稿的统一归属；首次同步 upsert 出来，用户可在编辑页改挂到真实项目
const SYNC_PROJECT_SLUG = "github-sync";

async function ensureSyncProject(userId: string) {
  return db.project.upsert({
    where: { userId_slug: { userId, slug: SYNC_PROJECT_SLUG } },
    update: {},
    create: {
      userId,
      slug: SYNC_PROJECT_SLUG,
      name: "GitHub 同步",
      kind: "tool",
      status: "WIP",
      summary: "自动同步的 GitHub 提交草稿，可在编辑页改写后改挂到真实项目",
    },
  });
}

async function collectExistingShas(userId: string): Promise<Set<string>> {
  const rows = await db.log.findMany({
    where: { userId, sourceCommitSha: { not: null } },
    select: { sourceCommitSha: true },
  });

  return new Set(rows.map((row) => row.sourceCommitSha ?? "").filter(Boolean));
}

// slug 撞唯一键（同仓库同日但首条 sha 不同，或旧草稿还在）时追加序号重试，最多 20 次
async function saveWithSlugCollision(
  draft: ReturnType<typeof buildDraft>,
  projectId: string,
  userId: string,
  attempt: number,
): Promise<string | null> {
  const slug = attempt === 0 ? draft.slug : `${draft.slug}-${attempt + 1}`;
  const result = await saveLog(
    {
      projectId,
      slug,
      title: draft.title,
      tags: draft.tags,
      beforeContent: draft.beforeContent,
      afterContent: draft.afterContent,
      beforeDate: draft.beforeDate,
      afterDate: draft.afterDate,
      sourceCommitSha: draft.sourceCommitSha,
    },
    userId,
  );

  if (result.ok) {
    return result.slug;
  }

  if (result.code === "LOG_001" && attempt < 20) {
    return saveWithSlugCollision(draft, projectId, userId, attempt + 1);
  }

  return null;
}

export async function syncGithubAction() {
  const session = await requireAdminSession();

  if (!session) {
    redirect("/admin?error=AUTH_001");
  }

  const userId = session.userId;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  });

  if (!user?.githubAccessToken) {
    redirect("/admin?error=SYNC_001");
  }

  let token: string;

  try {
    token = decryptToken(user.githubAccessToken);
  } catch {
    // 密钥轮换或密文损坏：等同未绑定，提示重登（重登会重新截获并加密落库）
    redirect("/admin?error=SYNC_001");
  }

  let commits;

  try {
    const login = await fetchUserLogin(token);
    const repos = await fetchSyncRepos(token);
    commits = await fetchAllCommits(token, repos, login);
  } catch (error) {
    if (error instanceof SyncError && error.kind === "auth") {
      redirect("/admin?error=SYNC_002");
    }

    redirect("/admin?error=SYNC_003");
  }

  const project = await ensureSyncProject(userId);
  const existingShas = await collectExistingShas(userId);
  const kept = filterCommits(commits.commits, existingShas);
  const groups = groupByRepoDay(kept);

  let synced = 0;

  for (const group of groups) {
    const draft = buildDraft(group);
    const saved = await saveWithSlugCollision(draft, project.id, userId, 0);

    if (saved) {
      synced = synced + 1;
    }
  }

  const skipped = commits.commits.length - kept.length;

  revalidatePath("/admin");
  redirect(`/admin?synced=${synced}&skipped=${skipped}`);
}
