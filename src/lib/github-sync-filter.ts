/**
 * 文件：src/lib/github-sync-filter.ts
 * 描述：GitHub 同步的纯逻辑：四道过滤（去 merge/去无意义/去重/同日合并）、slug 净化与草稿拼装
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（V2.0 Step 5 Commit 2）。全部为纯函数，不碰数据库与网络，供 node --test 直接覆盖
 * - 2026-11-10: Step 5 调试轮：filterCommits 加 console.log（各过滤步计数 + 前 3 条 commit 的 author 样本）；临时代码，上线前移除
 */
import { LIMITS } from "./forms.ts";

// GitHub API 返回的 commit 经 github-sync.ts 归一化后的形状
export type RawCommit = {
  sha: string;
  message: string;
  date: string; // ISO 8601（UTC）
  repo: string; // owner/name
  author?: string; // GitHub login（顶层 author.login，调试用；可选避免破坏纯函数测试）
};

// 一条草稿所需的全部字段（projectId 由动作层填入虚拟项目 id）
export type SyncDraft = {
  slug: string;
  title: string;
  tags: string[];
  beforeContent: string;
  afterContent: string;
  beforeDate: Date;
  afterDate: Date;
  sourceCommitSha: string;
};

const MERGE_PREFIXES = [
  "merge pull request",
  "merge branch",
  "merge remote-tracking",
];

// 整词匹配：首行归一化后恰好等于这些才算无意义；"fix critical bug" 这种带实义的不误杀
const MEANINGLESS = new Set([
  "update",
  "updates",
  "fix",
  "fixes",
  "wip",
  "tmp",
  "temp",
  "test",
  "testing",
  "cleanup",
  "clean up",
  "minor",
  "typo",
  "typos",
  "init",
  "initial",
  "initial commit",
  "first commit",
  "misc",
  "changes",
  "change",
  "refactor",
  "stuff",
]);

export function firstLine(message: string): string {
  return message.split("\n")[0].trim();
}

export function isMergeCommit(message: string): boolean {
  const line = firstLine(message).toLowerCase();

  return MERGE_PREFIXES.some((prefix) => line.startsWith(prefix));
}

// 首行去尾部标点、转小写后整词比对黑名单；长度判定独立在外（<10 字符一律丢）
export function isMeaningless(message: string): boolean {
  const line = firstLine(message).toLowerCase().replace(/[.!]+$/, "").trim();

  return MEANINGLESS.has(line);
}

// 仓库名净化成 slug 片段：小写、非字母数字转连字符、压连续连字符、去首尾连字符；空串回落 repo
export function sanitizeRepoSlug(repo: string): string {
  const cleaned = repo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned.length > 0 ? cleaned : "repo";
}

// 草稿 slug：gh-<仓库净化>-<yyyymmdd>，总长截到 64 位内且仍匹配 SLUG_PATTERN。
// 截断只动仓库段，保住 gh- 前缀与 8 位日期后缀；末尾若是连字符再去掉
export function buildDraftSlug(repo: string, isoDate: string): string {
  const day = isoDate.slice(0, 10).replace(/-/g, "");
  const prefix = "gh-";
  const suffix = `-${day}`;
  const room = 64 - prefix.length - suffix.length;
  // 只取仓库名（owner/name 的后段），与标题/tag 同口径；owner 对同一用户是常量，不必进 slug
  const repoName = repo.split("/").pop() ?? repo;
  const repoPart = sanitizeRepoSlug(repoName).slice(0, Math.max(room, 1)).replace(/-+$/, "");
  let slug = `${prefix}${repoPart}${suffix}`;

  if (slug.length > 64) {
    slug = slug.slice(0, 64).replace(/-+$/, "");
  }

  return slug;
}

// 前三道过滤：去 merge、去无意义（含 <10 字符）、按 sha 去重。第四道（同日合并）在 groupByRepoDay
export function filterCommits(
  commits: RawCommit[],
  existingShas: ReadonlySet<string>,
): RawCommit[] {
  const seen = new Set<string>();
  const kept: RawCommit[] = [];
  let mergeCount = 0;
  let meaninglessCount = 0;
  let dedupCount = 0;

  for (const commit of commits) {
    if (isMergeCommit(commit.message)) {
      mergeCount = mergeCount + 1;
      continue;
    }

    const line = firstLine(commit.message);

    if (line.length < 10 || isMeaningless(commit.message)) {
      meaninglessCount = meaninglessCount + 1;
      continue;
    }

    if (existingShas.has(commit.sha) || seen.has(commit.sha)) {
      dedupCount = dedupCount + 1;
      continue;
    }

    seen.add(commit.sha);
    kept.push(commit);
  }

  console.log(`[sync-debug] filterCommits: input=${commits.length}, merge=${mergeCount}, meaningless=${meaninglessCount}, dedup=${dedupCount}, kept=${kept.length}`);

  if (commits.length > 0) {
    const samples = commits.slice(0, 3).map((c) => `${c.sha.slice(0, 8)} author=${c.author ?? "(null)"} msg="${firstLine(c.message).slice(0, 40)}"`);
    console.log(`[sync-debug] sample commits: ${JSON.stringify(samples)}`);
  }

  return kept;
}

// 第四道：按 仓库 + UTC 日 分组，组内按时间升序。返回数组的数组，顺序按各组首条时间升序
export function groupByRepoDay(commits: RawCommit[]): RawCommit[][] {
  const buckets = new Map<string, RawCommit[]>();

  for (const commit of commits) {
    const key = `${commit.repo}|${commit.date.slice(0, 10)}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(commit);
    } else {
      buckets.set(key, [commit]);
    }
  }

  const groups = [...buckets.values()];

  for (const group of groups) {
    group.sort((a, b) => a.date.localeCompare(b.date));
  }

  groups.sort((a, b) => a[0].date.localeCompare(b[0].date));

  return groups;
}

function formatMonthDay(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split("-");

  return `${Number(month)}月${Number(day)}日`;
}

// 把一组（同仓库同日）commit 拼成一条草稿。单条取 message 首行做标题、AFTER 留占位；
// 多条标题带仓库与条数、AFTER 列当天首行清单给后续改写留原料。BEFORE 一律占位（满足非空校验）
export function buildDraft(group: RawCommit[]): SyncDraft {
  const first = group[0];
  const last = group[group.length - 1];
  const repoName = first.repo.split("/").pop() ?? first.repo;
  const placeholder = "（等待补充）";

  let title: string;
  let afterContent: string;

  if (group.length === 1) {
    title = firstLine(first.message);
    afterContent = placeholder;
  } else {
    title = `${repoName} · ${formatMonthDay(first.date)} · ${group.length} 条提交`;
    afterContent = group.map((commit) => `- ${firstLine(commit.message)}`).join("\n");
  }

  return {
    slug: buildDraftSlug(first.repo, first.date),
    title: title.slice(0, LIMITS.title),
    tags: ["github-sync", sanitizeRepoSlug(repoName).slice(0, LIMITS.tag)],
    beforeContent: placeholder,
    afterContent,
    beforeDate: new Date(first.date),
    afterDate: new Date(last.date),
    sourceCommitSha: first.sha,
  };
}