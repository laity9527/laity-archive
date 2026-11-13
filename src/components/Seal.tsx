/**
 * 文件：src/components/Seal.tsx
 * 描述：日志详情底部的档案凭据：展示 SHA-256 正文摘要与服务器发布时间，并可复制链接 / 哈希
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
 */
import { CopyButton } from "@/components/CopyButton";
import { formatUtc } from "@/lib/time";

type SealProps = {
  contentHash: string;
  publishedAt: Date;
  // 当前日志的站内路径；缺省时不渲染「复制链接」
  path?: string;
};

export function Seal({ contentHash, publishedAt, path }: SealProps) {
  return (
    <div className="mt-16 border border-ink p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 -rotate-1 flex-col items-center justify-center border border-ink text-center font-mono text-[8px] leading-[1.5] tracking-[0.08em] text-ink"
        >
          <span>LAITY</span>
          <span>内容摘要</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            内容摘要 · CONTENT DIGEST
          </p>
          <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-ink">
            {contentHash}
          </p>
          <p className="mt-2 font-sans text-[11px] text-ink-soft">
            发布时间 ·{" "}
            <span className="font-mono">{formatUtc(publishedAt)}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 font-sans text-[11px]">
            {path && (
              <CopyButton text={path} label="复制链接" withOrigin />
            )}
            <CopyButton text={contentHash} label="复制哈希" />
            <details className="basis-full">
              <summary className="w-fit cursor-pointer list-none border-b border-transparent text-ink-soft hover:border-ink hover:text-ink [&::-webkit-details-marker]:hidden">
                如何核对
              </summary>
              <p className="mt-2 max-w-[560px] font-sans text-[11px] leading-relaxed text-ink-soft">
                摘要口径：标题 + 换行 + BEFORE 正文 + 换行 + AFTER
                正文，按 UTF-8 取 SHA-256 小写十六进制；发布时间取服务器时间。
                在本地用同一段文本复算，结果应与上面的值一致。
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
