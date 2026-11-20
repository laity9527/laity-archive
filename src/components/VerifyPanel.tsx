/**
 * 文件：src/components/VerifyPanel.tsx
 * 描述：浏览器自助核验面板：用 WebCrypto 在本地按 hashVersion 选 v1/v2 口径复算 SHA-256，
 *       与服务端存证值比对，不依赖服务端结论；展示规范化规则文本（常量单源）
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 复算拼接口径改走 assembleVerifyInput（公式单源，与服务端 v1/v2 钉在同一函数上）
 * - 2026-11-18: 初始创建（V5 Phase 1 /verify）。规范化逻辑复用 src/lib/canonical-hash.ts 的
 *               normalizeContent（纯函数，无 node:crypto 依赖，可进客户端包）；
 *               哈希拼接口径与 v1/v2 服务端实现一一对应，向量由 tests/canonical-hash.test.ts 钉住
 */
"use client";

import { useEffect, useState } from "react";
import { assembleVerifyInput } from "@/lib/canonical-hash";

type VerifyPanelProps = {
  title: string;
  beforeContent: string;
  afterContent: string | null;
  storedHash: string;
  hashVersion: 1 | 2;
  rulesText: string;
  publishedAt: Date;
  version: number;
  slug: string;
};

type VerifyState =
  | { status: "computing" }
  | { status: "done"; recomputed: string; match: boolean }
  | { status: "failed"; message: string };

async function digestHex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function VerifyPanel({
  title,
  beforeContent,
  afterContent,
  storedHash,
  hashVersion,
  rulesText,
  publishedAt,
  version,
  slug,
}: VerifyPanelProps) {
  const [state, setState] = useState<VerifyState>({ status: "computing" });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // 拼接口径单源：assembleVerifyInput 与服务端 computeContentHashV1/V2 同公式
        const input = assembleVerifyInput(hashVersion, title, beforeContent, afterContent);
        const recomputed = await digestHex(input);

        if (!cancelled) {
          setState({ status: "done", recomputed, match: recomputed === storedHash });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [title, beforeContent, afterContent, storedHash, hashVersion]);

  return (
    <section
      id="verify"
      aria-label="存证核验"
      className="border border-hairline p-5"
    >
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft">VERIFY</span>
        <span className="font-sans text-xs text-ink-soft">自助核验</span>
      </p>
      <dl className="mt-4 space-y-4">
        <div>
          <dt className="font-sans text-xs text-ink-soft">存证对象</dt>
          <dd className="mt-1 font-sans text-xs leading-relaxed text-ink">
            {slug} · 第 <span className="font-mono">v{version}</span> 版 ·{" "}
            <span className="font-mono">hashVersion {hashVersion}</span> ·{" "}
            <span className="font-mono">{publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
          </dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">服务端存证值</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
            {storedHash}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-ink-soft">浏览器复算值</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
            {state.status === "computing" && "计算中…"}
            {state.status === "failed" && <span className="text-ink-soft">{state.message}</span>}
            {state.status === "done" && state.recomputed}
          </dd>
        </div>
        {state.status === "done" && (
          <div>
            <dt className="font-sans text-xs text-ink-soft">核验结论</dt>
            <dd
              className={`mt-1 font-sans text-xs ${
                state.match ? "text-ink" : "text-ink-soft"
              }`}
            >
              {state.match
                ? "一致：本地复算与存证值相同，本版内容自发布起未被改动。"
                : "不一致：本地复算与存证值不同，请核对版本或正文。"}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-sans text-xs text-ink-soft">复算口径</dt>
          <dd className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">{rulesText}</dd>
        </div>
      </dl>
    </section>
  );
}
