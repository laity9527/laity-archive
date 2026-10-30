/**
 * 文件：src/components/Editor.tsx
 * 描述：双栏 Markdown 编辑器客户端组件：左侧切换 BEFORE/AFTER 书写，右侧走同一 sanitize 管线预览
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
"use client";

import { useState } from "react";
import { Markdown } from "@/lib/markdown";

type EditorProps = {
  initialBefore: string;
  initialAfter: string;
};

type Tab = "before" | "after";

export function Editor({ initialBefore, initialAfter }: EditorProps) {
  const [tab, setTab] = useState<Tab>("before");
  const [before, setBefore] = useState(initialBefore);
  const [after, setAfter] = useState(initialAfter);
  const active = tab === "before" ? before : after;

  const tabClass = (value: Tab) =>
    `border-b pb-1 font-mono text-[10px] tracking-[0.2em] ${
      tab === value
        ? "border-ink text-ink"
        : "border-transparent text-ink-soft hover:text-ink"
    }`;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => setTab("before")} className={tabClass("before")}>
            BEFORE
          </button>
          <button type="button" onClick={() => setTab("after")} className={tabClass("after")}>
            AFTER
          </button>
          <span className="ml-auto font-mono text-[10px] text-ink-soft">
            AFTER 可留空
          </span>
        </div>

        <textarea
          name="beforeContent"
          aria-label="BEFORE 正文（Markdown）"
          value={before}
          onChange={(event) => setBefore(event.target.value)}
          hidden={tab !== "before"}
          rows={20}
          spellCheck={false}
          className="mt-4 w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
        />
        <textarea
          name="afterContent"
          aria-label="AFTER 正文（Markdown，可留空）"
          value={after}
          onChange={(event) => setAfter(event.target.value)}
          hidden={tab !== "after"}
          rows={20}
          spellCheck={false}
          className="mt-4 w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
        />
      </div>

      <div className="border border-hairline px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          PREVIEW · {tab.toUpperCase()}
        </p>
        <div className="mt-4">
          {active.trim().length > 0 ? (
            <Markdown source={active} />
          ) : (
            <p className="font-mono text-[11px] text-ink-soft">EMPTY</p>
          )}
        </div>
      </div>
    </div>
  );
}
