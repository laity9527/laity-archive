/**
 * 文件：src/components/Seal.tsx
 * 描述：日志详情证据读数与发布印记：EvidencePanel 唯一展示三读数；Stamp 只留站点标记、日期与锚点
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建
 * - 2026-11-02: formatUtc 改由 src/lib/time.ts 提供
 * - 2026-11-03: 对外标题从"存证印章"改为"内容摘要"——哈希只是可核对的技术标记，不写成服务承诺
 * - 2026-11-06: 第二批去英文——CONTENT HASH 改「内容摘要」、PUBLISHED AT 改「发布时间」，标签走 font-sans、
 *               哈希与 UTC 时刻仍留 font-mono（英文标识与时间戳按视觉铁律强制等宽）
 * - 2026-11-06: 负责人追加裁断——末行中文说明单独包 font-sans，不再继承容器的等宽（SHA-256 作为句内标识随之走 sans，
 *               拆成两段会让一句话里出现三种字形）
 * - 2026-11-13: B2 升级为「内容摘要」卡：左侧零圆角方章、右侧哈希与时间，新增复制链接 / 复制哈希 /
 *               如何核对三个动作；口径仍写「内容摘要」而不是「凭据」——哈希只是可核对的技术标记，
 *               不暗示法律效果；摘要算法同 src/lib/content-hash.ts 的 D5 口径
 * - 2026-11-16: 评审 G13：动作行加「分享」（Web Share，不支持则复制链接）；需传入标题以给系统面板
 * - 2026-11-17: P2 证据层（V4 §4.4）：完整哈希只留在 `EvidencePanel`（桌面右栏 / 移动端首段后）；
 *               `Stamp` 收编原 Seal 的站点标记、发布日期与锚点，不再重复哈希与发布时间。
 *               三读数顺序固定：发布时间 → 内容摘要 → 提交来源；无提交来源写「本地记录」，不造伪 sha。
 */
import { CopyButton } from "@/components/CopyButton";
import { ShareButton } from "@/components/ShareButton";
import { formatUtc } from "@/lib/time";

type EvidencePanelProps = {
  contentHash: string;
  publishedAt: Date;
  sourceCommitSha?: string | null;
  repoUrl?: string | null;
  title?: string;
  path?: string;
  /** rail：桌面右栏；mobile：正文首段之后的整宽面板 */
  variant?: "rail" | "mobile";
};

// 4 字符分组只影响显示；复制仍用未分组的 64 位原串
function groupHash(hash: string): string {
  return hash.match(/.{1,4}/g)?.join(" ") ?? hash;
}

function commitHref(repoUrl: string | null | undefined, sha: string): string | null {
  if (!repoUrl) return null;
  return `${repoUrl.replace(/\.git\/?$/, "").replace(/\/$/, "")}/commit/${sha}`;
}

export function EvidencePanel({
  contentHash,
  publishedAt,
  sourceCommitSha,
  repoUrl,
  title,
  path,
  variant = "rail",
}: EvidencePanelProps) {
  const sha = sourceCommitSha?.trim() || null;
  const href = sha ? commitHref(repoUrl, sha) : null;
  const visibility = variant === "rail" ? "hidden lg:block print:block" : "lg:hidden print:hidden";

  return (
    <section
      id="evidence"
      aria-label="内容读数"
      className={`${visibility} border border-hairline p-5 print:block print:border-0 print:p-0`}
    >
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">READOUT</span>
        <span className="font-sans text-xs text-ink-soft">三读数</span>
      </p>
      <dl className="mt-4 space-y-4">
        <div>
          <dt className="font-sans text-xs text-ink-soft">发布时间</dt>
          <dd className="mt-1 font-mono text-xs text-ink">{formatUtc(publishedAt)}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">内容摘要</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
            {variant === "rail" ? groupHash(contentHash) : `${contentHash.slice(0, 16)}…`}
          </dd>
          <dd className="mt-2 no-print">
            <CopyButton text={contentHash} label="复制完整摘要" />
          </dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">提交来源</dt>
          <dd className="mt-1 font-sans text-xs leading-relaxed text-ink">
            {sha && href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="border-b border-transparent text-ink hover:border-ink"
              >
                GitHub 提交 · {sha.slice(0, 7)} ↗
              </a>
            ) : sha ? (
              `GitHub 提交 · ${sha.slice(0, 7)}`
            ) : (
              <span className="text-ink-soft">本地记录：该条目未经 GitHub 同步，无可追溯提交</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">复算口径</dt>
          <dd className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">
            SHA-256(标题 + 换行 + BEFORE + 换行 + AFTER)，UTF-8，小写十六进制
          </dd>
        </div>
      </dl>
      {(path || title) && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-hairline pt-3 text-xs no-print">
          {path && <CopyButton text={path} label="复制链接" withOrigin />}
          {path && title && <ShareButton title={title} path={path} />}
        </div>
      )}
    </section>
  );
}

/** 发布印记：只留站点标记、发布日期与锚点；哈希归 EvidencePanel 唯一所有 */
export function Stamp({ publishedAt }: { publishedAt: Date }) {
  return (
    <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-y border-hairline py-4">
      <p className="flex items-baseline gap-3">
        <span className="font-mono text-xs tracking-[0.2em] text-ink">LAITY</span>
        <span className="font-sans text-xs text-ink-soft">已发布</span>
      </p>
      <p className="font-sans text-xs text-ink-soft">
        发布时间 <span className="font-mono text-ink">{formatUtc(publishedAt)}</span>
      </p>
      <p className="flex gap-4 font-sans text-xs no-print">
        <a href="#evidence" className="border-b border-transparent text-ink-soft hover:border-ink hover:text-ink">
          核对读数 ↑
        </a>
        <a href="#main" className="border-b border-transparent text-ink-soft hover:border-ink hover:text-ink">
          返回顶部 ↑
        </a>
      </p>
    </div>
  );
}
