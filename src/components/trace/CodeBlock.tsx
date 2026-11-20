/**
 * 文件：src/components/CodeBlock.tsx
 * 描述：正文代码块：语言标签 + 复制按钮 + 横向滚动（不做语法高亮，裁定见重构方案）
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B0）。日志里的代码块原先只是 <pre>，
 *               读者看不出语言、也没法一键复制；这里把 react-markdown 的 pre 接管过来，
 *               语言取自 code 的 language-* class（sanitize 默认 schema 已放行该模式）
 * - 2026-11-16: 评审 G4：加「行号」开关（默认关，保原观感）。行号列只用于阅读，
 *               aria-hidden 且不可选中；复制仍只复制代码本体，不带行号
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/trace/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-20: a11y 二期 L2（方案A）：两个横滚容器（非行号模式 <pre>、行号模式 .code-block__lined）
 *               追加 tabIndex={0} + role="region" + aria-label，使长行横滚对键盘用户可达（WCAG 2.1.1）；
 *               仅追加 DOM 属性，不改 CSS、不新增样式、不改动布局
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
  const [showLines, setShowLines] = useState(false);
  const lines = code.split("\n");

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
        <span className="code-block__actions">
          <button
            type="button"
            onClick={() => setShowLines((value) => !value)}
            aria-pressed={showLines}
            className="code-block__copy"
          >
            {showLines ? "隐藏行号" : "行号"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className="code-block__copy"
          >
            {state === "done" ? "已复制" : state === "fail" ? "复制失败" : "复制"}
          </button>
        </span>
      </div>

      {showLines ? (
        <div className="code-block__lined" tabIndex={0} role="region" aria-label="代码块，可使用左右方向键横向滚动查看">
          {/* 行号只是阅读辅助：不进选中、不进复制、不被读屏重复播报 */}
          <pre aria-hidden="true" className="code-block__lines">
            {lines.map((_, index) => index + 1).join("\n")}
          </pre>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        <pre tabIndex={0} role="region" aria-label="代码块，可使用左右方向键横向滚动查看">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
