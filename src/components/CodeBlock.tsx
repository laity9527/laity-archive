/**
 * 文件：src/components/CodeBlock.tsx
 * 描述：正文代码块：语言标签 + 复制按钮 + 横向滚动（不做语法高亮，裁定见重构方案）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。日志里的代码块原先只是 <pre>，
 *               读者看不出语言、也没法一键复制；这里把 react-markdown 的 pre 接管过来，
 *               语言取自 code 的 language-* class（sanitize 默认 schema 已放行该模式）
 */
"use client";

import { useState } from "react";

type CodeBlockProps = {
  lang: string;
  code: string;
};

type CopyState = "idle" | "done" | "fail";

export function CodeBlock({ lang, code }: CodeBlockProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setState("done");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("fail");
    }
  }

  return (
    <div className="code-block" data-lang={lang || undefined}>
      <div className="code-block__bar">
        <span className="code-block__lang">{lang || "text"}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="code-block__copy"
        >
          {state === "done" ? "已复制" : state === "fail" ? "复制失败" : "复制"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
