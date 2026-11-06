/**
 * 文件：src/components/Seal.tsx
 * 描述：日志详情底部的防伪印章：展示 SHA-256 正文哈希与服务器发布时间
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
 */
import { formatUtc } from "@/lib/time";

type SealProps = {
  contentHash: string;
  publishedAt: Date;
};

export function Seal({ contentHash, publishedAt }: SealProps) {
  return (
    <div className="mt-16 border border-ink p-5 font-mono text-[11px] leading-relaxed text-ink-soft">
      <p className="font-sans text-ink">内容摘要</p>
      <p className="mt-3 break-all">
        <span className="font-sans">{`内容摘要 · `}</span>
        <span>{contentHash}</span>
      </p>
      <p className="mt-1">
        <span className="font-sans">{`发布时间 · `}</span>
        <span>{formatUtc(publishedAt)}</span>
      </p>
      <p className="mt-3 text-ink-soft">
        <span className="font-sans">
          SHA-256 覆盖标题与双正文，发布时间取服务器时间。
        </span>
      </p>
    </div>
  );
}
