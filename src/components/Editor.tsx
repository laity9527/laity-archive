/**
 * 文件：src/components/Editor.tsx
 * 描述：双栏 Markdown 编辑器客户端组件：左侧切换 BEFORE/AFTER 书写，右侧走同一 sanitize 管线预览，支持把图片上传到 OSS 并在光标处插入 Markdown
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: Phase 5b 接入图片上传（Server Action 返回直链，插入到当前页签的光标位置）
 * - 2026-11-02: 上传错误文案改读 src/lib/error-text.ts 的共用表
 * - 2026-11-04: 隐藏的文件输入补 aria-label——它没有可见文案也没有关联 label，读屏下是个无名控件
 * - 2026-11-04: 正文与初始值不一致时挂 beforeunload 拦截；任一表单提交即清除标记，
 *               避免"刚点保存就被浏览器问要不要离开"
 * - 2026-11-04: 提交时把两份正文暂存进 sessionStorage，仅在服务端打回（页面带 ?error= 回来）时回填
 * - 2026-11-04: 上传结果提示补活区：错误用 role=alert、成功用 role=status，读屏才会在异步返回时读出来（D27）
 *               （D26）——原先被拒的保存会 redirect 回编辑页并从库里重渲染，写到一半的字整段没，
 *               而清 dirty 标记又恰好把丢稿拦截在这条路上解除武装
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { uploadImageAction } from "@/app/admin/upload-action";
import { errorTextOf } from "@/lib/error-text";
import { Markdown } from "@/lib/markdown";

type EditorProps = {
  initialBefore: string;
  initialAfter: string;
  // 暂存按记录 id 分键；新建页传 "new"
  draftKey: string;
  // 只有服务端打回（页面带 ?error=）才回填，正常保存/发布成功不复活旧稿
  restoreDraft?: boolean;
};

type Tab = "before" | "after";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

// alt 文本里的方括号与换行会破坏 Markdown 图片语法
function safeAlt(name: string) {
  return name.replace(/[[\]\r\n]/g, "").slice(0, 60) || "图片";
}

function stashKey(draftKey: string) {
  return `laity:draft:${draftKey}`;
}

// 读不到、解不出、形状不对，一律按"没有暂存"处理：不能让一次坏数据把编辑器卡住。
// 客户端组件也要过服务端那一遍渲染（硬加载带 ?error= 的文档时），那时没有 window
function readStash(draftKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(stashKey(draftKey)) ?? "",
    ) as { before?: unknown; after?: unknown };

    return {
      before: typeof parsed.before === "string" ? parsed.before : undefined,
      after: typeof parsed.after === "string" ? parsed.after : undefined,
    };
  } catch {
    return null;
  }
}

export function Editor({
  initialBefore,
  initialAfter,
  draftKey,
  restoreDraft = false,
}: EditorProps) {
  const [tab, setTab] = useState<Tab>("before");
  // 服务端打回时（页面带 ?error=）把提交前留下的正文捡回来。放在 useState 的初始函数里，
  // 不挂在 effect 的 setState 上：预览区与 dirty 判定都读同一份 state，回填一次就与手打无异
  const recovered = restoreDraft ? readStash(draftKey) : null;
  const [before, setBefore] = useState(recovered?.before ?? initialBefore);
  const [after, setAfter] = useState(recovered?.after ?? initialAfter);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const beforeRef = useRef<HTMLTextAreaElement>(null);
  const afterRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = tab === "before" ? before : after;
  const dirty = before !== initialBefore || after !== initialAfter;
  const dirtyRef = useRef(false);

  // 用 ref 而不是把 dirty 放进监听依赖：监听只挂一次，值每次渲染同步进去
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // 回填过一次就作废暂存：留在 sessionStorage 里，下次同一 id 带着别的错误回来会复活旧稿
  useEffect(() => {
    if (restoreDraft) {
      window.sessionStorage.removeItem(stashKey(draftKey));
    }
  }, [restoreDraft, draftKey]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) {
        return;
      }

      // 长文写到一半被误关标签页是这个工具最贵的事故；浏览器会用自己的文案提示，这里不代替它说话
      event.preventDefault();
    };

    // 提交不算"丢弃"，所以先清拦截标记；但被服务端拒掉的那一次要把正文留在 sessionStorage 里，
    // 否则页面从库里重渲染，写到一半的字就没了（只在带 ?error= 回来时才回填）
    const onSubmit = () => {
      if (dirtyRef.current) {
        window.sessionStorage.setItem(
          stashKey(draftKey),
          JSON.stringify({
            before: beforeRef.current?.value ?? before,
            after: afterRef.current?.value ?? after,
          }),
        );
      }

      dirtyRef.current = false;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [draftKey, before, after]);

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
        setStatus({ kind: "error", text: errorTextOf(result.code) });
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
            aria-label="选择要插入正文的图片"
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
            role={status.kind === "error" ? "alert" : "status"}
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

