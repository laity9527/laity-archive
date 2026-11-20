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
 * - 2026-11-06: 第二批去英文——PREVIEW 改「预览」、空态 EMPTY 改「暂无内容」并走 font-sans；
 *               BEFORE / AFTER 作为系统专有术语保留等宽英文（含 tab.toUpperCase() 的页签回显与两处 aria-label）
 * - 2026-11-10: Step 6 Commit 2：新增 [ AI 帮我写 ] 按钮——收当前表单里的 title 与两栏正文，调
 *               generateAiDraftAction；生成中按钮变「生成中…」并禁用防连点；成功回填 BEFORE/AFTER，
 *               失败只出 role=alert 横幅（正文保持现状）；保存/发布按钮不受任何阻塞
 * - 2026-11-10: Step 6 Commit 3：AI 成功后在表单内渲染隐藏域 isAiAssisted=true（随保存落库）；
 *               编辑页传 initialAiAssisted 保持既有标记；暂存同步带该位（服务端打回时不丢）
 * - 2026-11-13: 没有「- 提交」行时不再禁用，按标题与现有正文续写；全空时由服务端回 AI_006
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/admin/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：BEFORE/AFTER 切换按钮补 aria-pressed（读屏能知道当前在哪栏）
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateAiDraftAction } from "@/app/admin/ai-actions";
import { uploadImageAction } from "@/app/admin/upload-action";
import { estimateReadingMinutes } from "@/lib/reading-time";
import { scanSensitive } from "@/lib/sensitive-scan";
import { countBodyChars } from "@/lib/text-stats";
import { errorTextOf } from "@/lib/error-text";
import { Markdown } from "@/lib/markdown";

type EditorProps = {
  initialBefore: string;
  initialAfter: string;
  // 暂存按记录 id 分键；新建页传 "new"
  draftKey: string;
  // 只有服务端打回（页面带 ?error=）才回填，正常保存/发布成功不复活旧稿
  restoreDraft?: boolean;
  // 既有日志的 AI 标记：编辑页传进来后，表单里带隐藏域，保存不会把它清掉
  initialAiAssisted?: boolean;
};

type Tab = "before" | "after";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

// AI 生成的独立状态：与上传用的 Status 分开，两者永不归并（一处在忙不代表另一处也要禁用）
type AiState =
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
    ) as { before?: unknown; after?: unknown; aiAssisted?: unknown };

    return {
      before: typeof parsed.before === "string" ? parsed.before : undefined,
      after: typeof parsed.after === "string" ? parsed.after : undefined,
      aiAssisted: parsed.aiAssisted === true,
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
  initialAiAssisted,
}: EditorProps) {
  const [tab, setTab] = useState<Tab>("before");
  // 服务端打回时（页面带 ?error=）把提交前留下的正文捡回来。放在 useState 的初始函数里，
  // 不挂在 effect 的 setState 上：预览区与 dirty 判定都读同一份 state，回填一次就与手打无异
  const recovered = restoreDraft ? readStash(draftKey) : null;
  const [before, setBefore] = useState(recovered?.before ?? initialBefore);
  const [after, setAfter] = useState(recovered?.after ?? initialAfter);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [ai, setAi] = useState<AiState>({ kind: "idle" });
  const [aiAssisted, setAiAssisted] = useState(
    recovered?.aiAssisted ?? initialAiAssisted ?? false,
  );
  const beforeRef = useRef<HTMLTextAreaElement>(null);
  const afterRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = tab === "before" ? before : after;
  const dirty = before !== initialBefore || after !== initialAfter;

  // 字数与阅读时长：中文按字、拉丁按词，合计作为一个可核对的“体量”数字；
  // 分钟数复用详情页同一个 estimateReadingMinutes（400 字/分钟），避免两处口径不一
  const stats = useMemo(() => {
    const text = `${before}\n${after}`;

    return { chars: countBodyChars(text), minutes: estimateReadingMinutes(text) };
  }, [before, after]);

  // 敏感信息实时提示（评审 P6-1）：复用发布时同一个扫描函数，编辑时就把命中列出来。
  // 只提示、不拦保存；真正的阻断仍在发布动作里（服务端再扫一次，客户端改不了那条判据）
  const sensitiveHits = useMemo(
    () => scanSensitive(`${before}\n${after}`).filter((hit) => !hit.advisory),
    [before, after],
  );
  // AI 只依据「- 提交」列表生成：没有列表时客户端先禁用，服务端仍会再校一次（AI_006）
  const hasCommits = /^[ \t]*- /m.test(before) || /^[ \t]*- /m.test(after);
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
            aiAssisted,
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
  }, [draftKey, before, after, aiAssisted]);

  // 自动保存（F9）：停止输入 30s 或失焦时把正文写进 sessionStorage，并在工具栏显示时间戳。
  // 与提交时那次暂存共用同一个 key，所以服务端打回（?error=）回填的是最新一版，
  // 而不是“最后一次点保存”的版本；不存在任何自动提交，草稿状态不会被它改变
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saveDraftNow = useCallback(() => {
    if (!dirty) return;

    window.sessionStorage.setItem(
      stashKey(draftKey),
      JSON.stringify({ before, after, aiAssisted }),
    );
    setSavedAt(
      new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [dirty, draftKey, before, after, aiAssisted]);

  useEffect(() => {
    if (!dirty) return;

    const timer = window.setTimeout(saveDraftNow, 30_000);

    return () => window.clearTimeout(timer);
  }, [dirty, saveDraftNow]);

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

  // 取当前标签页的 textarea 与正文（两栏共用一套工具栏）
  function activeField() {
    return {
      el: tab === "before" ? beforeRef.current : afterRef.current,
      value: tab === "before" ? before : after,
      setValue: tab === "before" ? setBefore : setAfter,
    };
  }

  // 包裹选区：有选中就包住它，没选中就插入占位词并选中占位词，方便直接改
  function wrapSelection(beforeText: string, afterText: string, placeholder: string) {
    const { el, value, setValue } = activeField();

    if (!el) {
      setValue(`${value}${beforeText}${placeholder}${afterText}`);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;

    setValue(
      `${value.slice(0, start)}${beforeText}${selected}${afterText}${value.slice(end)}`,
    );

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + beforeText.length, start + beforeText.length + selected.length);
    });
  }

  // 上传一张图并把 Markdown 插到光标处；粘贴、拖拽、选文件三条入口共用
  async function uploadAndInsert(file: File) {
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

  // 快捷键：⌘/Ctrl + B / I / K（只改当前标签页的正文）
  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;

    const key = event.key.toLowerCase();

    if (key === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "粗体");
    } else if (key === "i") {
      event.preventDefault();
      wrapSelection("*", "*", "斜体");
    } else if (key === "k") {
      event.preventDefault();
      wrapSelection("[", "](https://)", "链接文字");
    }
  }

  // 粘贴截图即上传（非图片的粘贴保留默认行为）
  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith("image/"),
    );

    if (!file) return;

    event.preventDefault();
    await uploadAndInsert(file);
  }

  // 拖入图片即上传；拖其他东西不拦（避免抢表单其他行为）
  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );

    if (!file) return;

    event.preventDefault();
    await uploadAndInsert(file);
  }

  // 只响应手动点击：读整张表单（title 与两栏正文都在里面），没有自动触发路径——
  // 生成结果直接 setState 回填 textarea；任何异常都收敛为横幅，不外抛、不阻塞保存
  async function handleAiWrite(event: React.MouseEvent<HTMLButtonElement>) {
    if (ai.kind === "busy") return;

    // 按钮在 form 内（新建页与编辑页都这样组装）
    const form = event.currentTarget.form;
    if (!form) {
      setAi({ kind: "error", text: "AI 生成失败：按钮没有挂在表单里。" });
      return;
    }

    setAi({ kind: "busy" });

    try {
      const result = await generateAiDraftAction(new FormData(form));

      if (result.ok) {
        setBefore(result.data.beforeContent);
        setAfter(result.data.afterContent);
        // 生成即标记：这次提交的正文将带 isAiAssisted=true 落库，详情页据此打标签
        setAiAssisted(true);
        setAi({ kind: "done", text: "AI 生成完成，正文已回填。" });
        return;
      }

      // 失败不阻塞：正文保持现状，横幅让用户自己决定重试还是手动补全
      setAi({ kind: "error", text: errorTextOf(result.code) });
    } catch {
      setAi({ kind: "error", text: errorTextOf("AI_001") });
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // 清空 value，否则连续选同一个文件不会再触发 change
    event.target.value = "";

    if (!file) {
      return;
    }

    await uploadAndInsert(file);
  }

  return (
    <div
      className="grid gap-8 md:grid-cols-2"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <div>
        {/* AI 标记：点击 [ AI 帮我写 ] 成功后渲染；随整张表单提交，保存/发布动作据此落库 */}
        {aiAssisted && <input type="hidden" name="isAiAssisted" value="true" />}
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => setTab("before")} aria-pressed={tab === "before"} className={tabClass("before")}>
            BEFORE
          </button>
          <button type="button" onClick={() => setTab("after")} aria-pressed={tab === "after"} className={tabClass("after")}>
            AFTER
          </button>
          <span className="ml-auto flex items-baseline gap-3 font-mono text-[10px] text-ink-soft">
            <span>
              {stats.chars} 字 · 约 {stats.minutes} 分钟
            </span>
            <span>{savedAt ? `已自动保存 ${savedAt}` : "AFTER 可留空"}</span>
          </span>
        </div>

        {/* 格式工具栏：只操作当前标签页的正文；无选中时插入占位词并选中它 */}
        <div className="mt-3 flex flex-wrap items-baseline gap-4 border-b border-hairline pb-2 font-sans text-[11px] text-ink-soft">
          <span className="font-mono text-[10px] tracking-[0.16em]">格式</span>
          <button type="button" onClick={() => wrapSelection("**", "**", "粗体")} className="hover:text-ink">
            粗体
          </button>
          <button type="button" onClick={() => wrapSelection("*", "*", "斜体")} className="hover:text-ink">
            斜体
          </button>
          <button type="button" onClick={() => wrapSelection("`", "`", "代码")} className="hover:text-ink">
            行内码
          </button>
          <button type="button" onClick={() => wrapSelection("\n> ", "", "引用")} className="hover:text-ink">
            引用
          </button>
          <button type="button" onClick={() => wrapSelection("\n- ", "", "列表项")} className="hover:text-ink">
            列表
          </button>
          <button type="button" onClick={() => wrapSelection("[", "](https://)", "链接文字")} className="hover:text-ink">
            链接
          </button>
          <span className="ml-auto font-mono text-[10px]">⌘B / ⌘I / ⌘K</span>
        </div>

        {sensitiveHits.length > 0 && (
          <p
            aria-live="polite"
            className="mt-3 border-l-2 border-brown pl-3 font-sans text-[11px] leading-relaxed text-ink-soft"
          >
            可能含敏感信息：
            {sensitiveHits.map((hit) => `${hit.label} ${hit.count} 处`).join("、")}
            <span className="ml-2">发布时仍会再扫一次</span>
          </p>
        )}

        <textarea
          ref={beforeRef}
          name="beforeContent"
          aria-label="BEFORE 正文（Markdown）"
          value={before}
          onChange={(event) => setBefore(event.target.value)}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          onBlur={saveDraftNow}
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
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          onBlur={saveDraftNow}
          hidden={tab !== "after"}
          rows={20}
          spellCheck={false}
          className="mt-4 w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleAiWrite}
            disabled={ai.kind === "busy"}
            className="border border-ink px-4 py-2 font-sans text-[11px] text-ink hover:bg-ink hover:text-paper disabled:border-hairline disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft"
          >
            {ai.kind === "busy" ? "生成中…" : "AI 帮我写"}
          </button>
          <span className="font-sans text-[10px] text-ink-soft">
            {hasCommits
              ? "依据正文里的 Commit 列表生成"
              : "没有提交列表，将按标题与现有正文续写"}
          </span>
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
        {ai.kind === "error" && (
          <p role="alert" className="mt-3 border border-ink px-3 py-2 font-mono text-[11px] text-ink">
            {ai.text}
          </p>
        )}
        {ai.kind === "done" && (
          <p role="status" className="mt-3 border border-hairline px-3 py-2 font-mono text-[11px] text-ink-soft">
            {ai.text}
          </p>
        )}
      </div>

      <div className="border border-hairline px-4 py-3">
        <p className="text-[10px] text-ink-soft">
          <span className="font-sans">{`预览 · `}</span>
          <span className="font-mono">{tab.toUpperCase()}</span>
        </p>
        <div className="mt-4">
          {active.trim().length > 0 ? (
            <Markdown source={active} />
          ) : (
            <p className="font-sans text-[11px] text-ink-soft">暂无内容</p>
          )}
        </div>
      </div>
    </div>
  );
}

