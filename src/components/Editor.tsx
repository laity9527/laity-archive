/**
 * 文件：src/components/Editor.tsx
 * 描述：双栏 Markdown 编辑器客户端组件：左侧切换 BEFORE/AFTER 书写，右侧走同一 sanitize 管线预览，支持把图片上传到 OSS 并在光标处插入 Markdown
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: Phase 5b 接入图片上传（Server Action 返回直链，插入到当前页签的光标位置）
 */
"use client";

import { useRef, useState } from "react";
import { uploadImageAction } from "@/app/admin/upload-action";
import { Markdown } from "@/lib/markdown";

type EditorProps = {
  initialBefore: string;
  initialAfter: string;
};

type Tab = "before" | "after";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

const UPLOAD_ERROR_TEXT: Record<"AUTH_001" | "IMG_001", string> = {
  AUTH_001: "会话已失效，请重新登录后再试。",
  IMG_001: "图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。",
};

// alt 文本里的方括号与换行会破坏 Markdown 图片语法
function safeAlt(name: string) {
  return name.replace(/[[\]\r\n]/g, "").slice(0, 60) || "图片";
}

export function Editor({ initialBefore, initialAfter }: EditorProps) {
  const [tab, setTab] = useState<Tab>("before");
  const [before, setBefore] = useState(initialBefore);
  const [after, setAfter] = useState(initialAfter);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const beforeRef = useRef<HTMLTextAreaElement>(null);
  const afterRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = tab === "before" ? before : after;

  const tabClass = (value: Tab) =>
    `border-b pb-1 font-mono text-[10px] tracking-[0.2em] ${
      tab === value
        ? "border-ink text-ink"
        : "border-transparent text-ink-soft hover:text-ink"
    }`;

  function insertAtCursor(snippet: string) {
    const isBefore = tab === "before";
    const el = isBefore ? beforeRef.current : afterRef.current;
    const current = isBefore ? before : after;
    const setValue = isBefore ? setBefore : setAfter;

    if (!el) {
      setValue(`${current}\n${snippet}`);
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;

    setValue(`${current.slice(0, start)}${snippet}${current.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // 清空 value，否则连续选同一个文件不会再触发 change
    event.target.value = "";

    if (!file) {
      return;
    }

    setStatus({ kind: "busy" });

    const data = new FormData();
    data.append("file", file);

    try {
      const result = await uploadImageAction(data);

      if (result.ok) {
        insertAtCursor(`\n![${safeAlt(file.name)}](${result.url})\n`);
        setStatus({ kind: "done", text: `已上传 · ${result.bytes} 字节` });
      } else {
        setStatus({ kind: "error", text: UPLOAD_ERROR_TEXT[result.code] });
      }
    } catch {
      setStatus({ kind: "error", text: "上传失败，请查看服务端日志。" });
    }
  }

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
          ref={beforeRef}
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
          ref={afterRef}
          name="afterContent"
          aria-label="AFTER 正文（Markdown，可留空）"
          value={after}
          onChange={(event) => setAfter(event.target.value)}
          hidden={tab !== "after"}
          rows={20}
          spellCheck={false}
          className="mt-4 w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={status.kind === "busy"}
            className="border border-ink px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
          >
            {status.kind === "busy" ? "上传中…" : "插入图片"}
          </button>
          <span className="font-mono text-[10px] text-ink-soft">
            jpg / png / webp / gif，≤5MB，存阿里云 OSS
          </span>
        </div>

        {status.kind !== "idle" && status.kind !== "busy" && (
          <p
            className={`mt-3 border px-3 py-2 font-mono text-[11px] ${
              status.kind === "error" ? "border-ink text-ink" : "border-hairline text-ink-soft"
            }`}
          >
            {status.text}
          </p>
        )}
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
