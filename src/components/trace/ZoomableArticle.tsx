/**
 * 文件：src/components/ZoomableArticle.tsx
 * 描述：正文容器：把 Markdown 里渲染出的图片接管为可点击放大的灯箱（原生 dialog，零依赖）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。正文图片此前固定 max-width:100%，截图里的
 *               文字在窄栏里读不清；这里用事件委托监听已渲染的 <img>，不注入任何 HTML，
 *               rehype-sanitize 管线不受影响。原生 dialog 自带焦点捕获与 Esc
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/trace/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：正文图片补键盘入口——tabindex=0 + role=button +
 *               aria-label"放大图片：…"，Enter/空格与点击同效开灯箱；关闭后焦点由原生 dialog 还回原图
 */
"use client";

import { useEffect, useRef, useState } from "react";

type Preview = { src: string; alt: string };

export function ZoomableArticle({ children }: { children: React.ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  // 事件委托：Markdown 产物由服务端渲染，这里只认 <img>，不改动其结构。
  // a11y：给图片补 tabindex/role/aria-label 成为键盘可达的"按钮"，Enter/空格与点击同效开灯箱
  useEffect(() => {
    const body = bodyRef.current;

    if (!body) return;

    for (const img of Array.from(body.querySelectorAll("img"))) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `放大图片：${img.alt || "未命名图片"}`);
    }

    function openFrom(target: EventTarget | null) {
      if (!(target instanceof HTMLImageElement)) return;

      const src = target.currentSrc || target.src;

      if (!src) return;

      setPreview({ src, alt: target.alt || "" });
    }

    function onClick(event: MouseEvent) {
      openFrom(event.target);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(event.target instanceof HTMLImageElement)) return;

      event.preventDefault();
      openFrom(event.target);
    }

    body.addEventListener("click", onClick);
    body.addEventListener("keydown", onKeyDown);

    return () => {
      body.removeEventListener("click", onClick);
      body.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // 打开/关闭与预览状态同步：showModal 自带焦点捕获，close 后浏览器把焦点还回原处
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (preview && !dialog.open) dialog.showModal();
    if (!preview && dialog.open) dialog.close();
  }, [preview]);

  return (
    <>
      <div ref={bodyRef}>{children}</div>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="图片预览"
        onCancel={(event) => {
          event.preventDefault();
          setPreview(null);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) setPreview(null);
        }}
      >
        {preview && (
          <figure className="lightbox__figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.alt}
              className="lightbox__img"
            />
            <figcaption className="lightbox__caption">
              <span>{preview.alt || "图片预览"}</span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="lightbox__close"
              >
                关闭 ✕
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
