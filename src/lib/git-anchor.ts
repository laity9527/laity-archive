/**
 * 文件：src/lib/git-anchor.ts
 * 描述：Git 时间锚的网络层（纯函数 + fetch）：存证文件路径、标签引用、规范化 md 组装，
 *       Contents API PUT + Refs API POST，以及吞错的静默包装
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建（V5 Phase 1）。从 git-evidence.ts 拆出：本文件不碰数据库、只走相对路径，
 *               node --test 可直接钉住路径/标签/md 格式与降级行为（接口非 2xx、网络抛错都不向上抛）；
 *               取数与 token 解密留在 git-evidence.ts 的外层
 */
import { normalizeContent } from "./canonical-hash.ts";

const API = "https://api.github.com";
const TIMEOUT_MS = 30_000;

export type GitAnchorInput = {
  userId: string;
  trace: {
    slug: string;
    title: string;
    beforeContent: string;
    afterContent: string | null;
    contentHash: string;
    publishedAt: Date;
  };
  version: number;
};

export type GitAnchorResult =
  | { ok: true; sha: string; tag: string; syncedAt: Date }
  | { ok: false; reason: string };

function ghFetch(
  path: string,
  token: string,
  init: { method?: string; body?: string } = {},
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** 存证仓库里的规范化 md：元信息头 + 规范化正文（与 canonical-hash v2 同口径，第三方可独立复算 */
export function buildCanonicalMd(input: GitAnchorInput): string {
  const t = input.trace;
  return [
    `# ${t.title}`,
    "",
    `- trace: ${t.slug}`,
    `- version: ${input.version}`,
    `- contentHash: ${t.contentHash}`,
    `- publishedAt: ${t.publishedAt.toISOString()}`,
    "",
    "## BEFORE",
    "",
    normalizeContent(t.beforeContent),
    "",
    "## AFTER",
    "",
    normalizeContent(t.afterContent ?? ""),
    "",
  ].join("\n");
}

/** 存证文件路径：traces/<slug>/v<N>.md（slug 逐段转义，防路径注入） */
export function evidenceFilePath(slug: string, version: number): string {
  return `traces/${encodeURIComponent(slug)}/v${version}.md`;
}

/** 存证标签引用：refs/tags/trace/<slug>/v<N>（与 evidenceFilePath 同一转义口径） */
export function evidenceTagRef(slug: string, version: number): string {
  return `refs/tags/trace/${encodeURIComponent(slug)}/v${version}`;
}

/** 只做网络层（Contents API PUT + Refs API POST）：token 由调用方解密好后传入，便于单测注入 */
export async function anchorGitEvidenceWithToken(
  input: GitAnchorInput,
  repo: string,
  token: string,
): Promise<GitAnchorResult> {
  const filePath = evidenceFilePath(input.trace.slug, input.version);
  const contentsRes = await ghFetch(
    `/repos/${repo}/contents/${filePath}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `trace ${input.trace.slug} v${input.version}`,
        content: Buffer.from(buildCanonicalMd(input), "utf8").toString("base64"),
      }),
    },
  );

  if (!contentsRes.ok) {
    return { ok: false, reason: `Contents API 返回 ${contentsRes.status}` };
  }

  const payload = (await contentsRes.json()) as {
    content?: { sha?: string };
    sha?: string;
  };
  const sha = payload.content?.sha ?? payload.sha;
  if (!sha) {
    return { ok: false, reason: "Contents API 响应缺少 sha" };
  }

  const tagRef = evidenceTagRef(input.trace.slug, input.version);
  const refsRes = await ghFetch(`/repos/${repo}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({ ref: tagRef, sha }),
  });

  if (!refsRes.ok) {
    return { ok: false, reason: `Refs API 返回 ${refsRes.status}` };
  }

  return { ok: true, sha, tag: tagRef.replace("refs/tags/", ""), syncedAt: new Date() };
}

/** 静默包装：锚定失败（接口非 2xx 或网络抛错）只记日志，绝不向上抛——发布已成功，降级即 gitSha 留 null */
export async function runGitAnchorQuietlyWithToken(
  input: GitAnchorInput,
  repo: string,
  token: string,
): Promise<void> {
  try {
    const result = await anchorGitEvidenceWithToken(input, repo, token);
    if (!result.ok) {
      console.error(`[git-anchor] 锚定未完成（${input.trace.slug} v${input.version}）：${result.reason}`);
    }
  } catch (error) {
    console.error(
      `[git-anchor] 锚定异常（${input.trace.slug} v${input.version}）：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
