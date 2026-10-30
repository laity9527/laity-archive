/**
 * 文件：src/components/Seal.tsx
 * 描述：日志详情底部的防伪印章：展示 SHA-256 正文哈希与服务器发布时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 创建
 */

type SealProps = {
  contentHash: string;
  publishedAt: Date;
};

function formatUtc(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function Seal({ contentHash, publishedAt }: SealProps) {
  return (
    <div className="mt-16 border border-ink p-5 font-mono text-[11px] leading-relaxed text-ink-soft">
      <p className="tracking-[0.2em] text-ink">存证印章</p>
      <p className="mt-3 break-all">CONTENT HASH · {contentHash}</p>
      <p className="mt-1">PUBLISHED AT · {formatUtc(publishedAt)}</p>
      <p className="mt-3 text-ink-soft">
        SHA-256 覆盖标题与双正文，发布时间取服务器时间。
      </p>
    </div>
  );
}
