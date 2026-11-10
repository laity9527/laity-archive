/**
 * 文件：src/lib/github-sync.ts
 * 描述：GitHub 同步的 API 侧：拉仓库与 commits（限并发 5、超时 10s）、错误分类；不含过滤与落库
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 2）。token 由调用方解好传入，本模块不碰密文与数据库
 * - 2026-11-10: Step 5 调试轮：加 console.log（每仓库 commit 数与失败原因）、RawCommit 提取顶层 author.login；临时代码，上线前移除
 */
import type { RawCommit } from "@/lib/github-sync-filter";

// API 失败分类：动作层据此映射 SYNC_002（4xx 授权类）/ SYNC_003（网络/超时/其他）
export type SyncErrorKind = "auth" | "network";

export class SyncError extends Error {
  readonly kind: SyncErrorKind;

  constructor(kind: SyncErrorKind, message: string) {
    super(message);
    this.name = "SyncError";
    this.kind = kind;
  }
}

export type RepoSummary = {
  fullName: string;
  private: boolean;
};

const API = "https://api.github.com";

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(path: string, token: string): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, {
      headers: headers(token),
      // GitHub 服务器响应在网络层，10 秒够到边缘；AbortSignal 是 Node 18+ 原生
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new SyncError("network", `GitHub 请求超时或不可达：${path}`);
  }
}

// 401/403 = token 被撤销或未授权；其余 4xx/5xx 也算鉴权面问题，由调用层兜底
function classifyStatus(status: number): boolean {
  return status === 401 || status === 403;
}

// 限并发 5 的 map：串行会因仓库数线性放大最长等待（30 次 × 10s 最坏），并发把总时长压到秒级
export async function mapLimit<T>(
  items: ReadonlyArray<T>,
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  let cursor = 0;

  async function run(workerIndex: number): Promise<void> {
    while (true) {
      const current = cursor;
      cursor = cursor + 1;

      if (current >= queue.length) {
        return;
      }

      const entry = queue[current];

      if (entry.index < workerIndex * 0) {
        // 占位分支：cursor 已单调推进，索引仅用于稳定顺序，不作跳步依据
      }

      await worker(entry.item);
    }
  }

  const concurrency = Math.min(Math.max(limit, 1), items.length || 1);
  await Promise.all(Array.from({ length: concurrency }, (_, i) => run(i)));
}

// 取本人拥有、最近有推送的公开仓库，按 push 时间倒序取前 30 个
export async function fetchSyncRepos(token: string, limit = 30): Promise<RepoSummary[]> {
  const res = await ghFetch(`/user/repos?affiliation=owner&sort=pushed&per_page=${limit}`, token);

  if (!res.ok) {
    if (classifyStatus(res.status)) {
      throw new SyncError("auth", `GitHub 拒绝授权：GET /user/repos 返回 ${res.status}`);
    }

    throw new SyncError("network", `GitHub 返回 ${res.status}：GET /user/repos`);
  }

  const rows = (await res.json()) as Array<{
    full_name: string;
    private: boolean;
  }>;

  // 只同步公开仓库（决策点 D-1）：scope 不加 repo 时 /user/repos 不返回私有项，这里再显式过滤一道
  return rows
    .filter((row) => !row.private && row.full_name)
    .map((row) => ({ fullName: row.full_name, private: row.private }));
}

// 拉某仓库最近 commits（不去 author 过滤——GitHub commits 的 author 参数匹配 git author 信息而非 login，
// 邮箱不一致时全灭；去重由 sourceCommitSha 兜底，不依赖客户端过滤）
export async function fetchRepoCommits(
  token: string,
  repo: string,
): Promise<RawCommit[]> {
  const res = await ghFetch(
    `/repos/${encodeURIComponent(repo)}/commits?per_page=50`,
    token,
  );

  if (!res.ok) {
    // 404 = 权限不足（scope 没有 public_repo）或仓库不存在；统一按鉴权类处理，
    // 动作层映射为 SYNC_002，提示用户重新登录授权
    if (res.status === 404 || classifyStatus(res.status)) {
      throw new SyncError("auth", `GitHub 拒绝授权：GET /repos/${repo}/commits 返回 ${res.status}`);
    }

    throw new SyncError("network", `GitHub 返回 ${res.status}：GET /repos/${repo}/commits`);
  }

  const rows = (await res.json()) as Array<{
    sha: string;
    commit: { message: string; author?: { date?: string }; committer?: { date?: string } };
    html_url?: string;
    author?: { login?: string };
  }>;

  return rows.map((row) => {
    const date =
      row.commit.author?.date ?? row.commit.committer?.date ?? "";

    return {
      sha: row.sha,
      message: row.commit.message,
      date,
      repo,
      author: row.author?.login ?? "(null)",
    };
  });
}

// 取本人 GitHub login（不是站内 handle）：author 过滤参数要用它——handle 与 login 在认领绑定时刻意不同
export async function fetchUserLogin(token: string): Promise<string> {
  const res = await ghFetch("/user", token);

  if (!res.ok) {
    if (classifyStatus(res.status)) {
      throw new SyncError("auth", `GitHub 拒绝授权：GET /user 返回 ${res.status}`);
    }

    throw new SyncError("network", `GitHub 返回 ${res.status}：GET /user`);
  }

  const me = (await res.json()) as { login?: string };

  return me.login ?? "";
}

// 并发拉全部仓库的 commits；单仓库失败记录后继续，不整批失败。
// 不去 author 过滤（邮箱不一致会导致全灭），去重由 sourceCommitSha 兜底
export async function fetchAllCommits(
  token: string,
  repos: RepoSummary[],
  concurrency = 5,
): Promise<{ commits: RawCommit[]; failedRepos: string[] }> {
  const results: RawCommit[][] = [];
  const failedRepos: string[] = [];

  await mapLimit(repos, concurrency, async (repo) => {
    try {
      const repoCommits = await fetchRepoCommits(token, repo.fullName);
      console.log(`[sync-debug] repo ${repo.fullName}: ${repoCommits.length} commits`);
      results.push(repoCommits);
    } catch (error) {
      if (error instanceof SyncError && error.kind === "auth") {
        throw error; // 授权失败是全局问题，整批抛出让动作层统一出错
      }

      console.log(`[sync-debug] repo ${repo.fullName}: FAILED (${error instanceof Error ? error.message : String(error)})`);
      failedRepos.push(repo.fullName); // 网络类单仓库失败降级，继续拉其余
    }
  });

  return { commits: results.flat(), failedRepos };
}
