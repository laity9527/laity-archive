/**
 * 文件：src/components/ZoomableArticle.tsx
 * 描述：正文容器：把 Markdown 里渲染出的图片接管为可点击放大的灯箱（原生 dialog，零依赖）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。正文图片此前固定 max-width:100%，截图里的
 *               文字在窄栏里读不清；这里用事件委托监听已渲染的 <img>，不注入任何 HTML，
 *               rehype-sanitize 管线不受影响。原生 dialog 自带焦点捕获与 Esc
 */
"use client";

import { useEffect, useRef, useState } from "react";

type Preview = { src: string; alt: string };

export function ZoomableArticle({ children }: { children: React.ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  // 事件委托：Markdown 产物由服务端渲染，这里只认 <img>，不改动其结构
  useEffect(() => {
    const body = bodyRef.current;

    if (!body) return;

    function onClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof HTMLImageElement)) return;

      const src = target.currentSrc || target.src;

      if (!src) return;

      setPreview({ src, alt: target.alt || "" });
    }

    body.addEventListener("click", onClick);

    return () => body.removeEventListener("click", onClick);
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
