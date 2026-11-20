/**
 * 文件：src/components/MediaUpload.tsx
 * 描述：媒体上传组件（客户端）：选文件 → 申请签名 → 直传 OSS → 完成登记；
 *       错误码按 MEDIA_001/002/003 展示服务端文案，不回显敏感信息
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 2.2）。单 PUT 直传（分片为优化项，本阶段不实现）
 * - 2026-11-19: 收尾自检：直传 403 单独提示签名过期（300 秒有效），与网络失败区分
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/admin/（纯结构调整，组件逻辑/样式/导出未变）
 * - 2026-11-19: V5 Phase 5 子任务4 a11y：上传进度与结果进常驻活区（此前签名/直传/登记/完成四段状态读屏无播报）
 */
"use client";

import { useState } from "react";

const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md";

type UploadState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "uploading"; percent: number }
  | { status: "registering" }
  | { status: "done"; ossUrl: string }
  | { status: "failed"; message: string };

export function MediaUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function handleFile(file: File) {
    setState({ status: "signing" });

    const signResponse = await fetch("/api/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, declaredSize: file.size }),
    });
    const signPayload = (await signResponse.json().catch(() => null)) as
      | { ok: boolean; data?: { ossKey: string; uploadUrl: string }; error?: { message?: string } }
      | null;

    if (!signResponse.ok || !signPayload?.ok || !signPayload.data) {
      setState({ status: "failed", message: signPayload?.error?.message ?? "签名失败，请重试。" });
      return;
    }

    setState({ status: "uploading", percent: 0 });
    const putResponse = await fetch(signPayload.data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });

    if (!putResponse.ok) {
      setState({
        status: "failed",
        message:
          putResponse.status === 403
            ? "直传签名已过期，请重新选择文件上传。"
            : "直传 OSS 失败，请检查网络后重试。",
      });
      return;
    }

    setState({ status: "registering" });
    const completeResponse = await fetch("/api/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ossKey: signPayload.data.ossKey, originalName: file.name }),
    });
    const completePayload = (await completeResponse.json().catch(() => null)) as
      | { ok: boolean; data?: { ossUrl: string }; error?: { message?: string } }
      | null;

    if (!completeResponse.ok || !completePayload?.ok) {
      setState({ status: "failed", message: completePayload?.error?.message ?? "登记失败，请重试。" });
      return;
    }

    setState({ status: "done", ossUrl: completePayload.data?.ossUrl ?? signPayload.data.ossKey });
  }

  return (
    <div className="border-y border-hairline py-5">
      <label className="flex flex-col gap-2 font-sans text-xs text-ink-soft">
        上传媒体（图片/文档白名单，禁止可执行文件，≤20MB）
        <input
          type="file"
          accept={ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
          className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
      </label>
      {/* 活区常驻：进度与结果都是已存在活区里的内容变化；失败仍走 alert 插队 */}
      <div aria-live="polite">
        {state.status === "signing" && <p className="mt-2 font-sans text-xs text-ink-soft">申请签名中…</p>}
        {state.status === "uploading" && <p className="mt-2 font-sans text-xs text-ink-soft">直传 OSS 中…</p>}
        {state.status === "registering" && <p className="mt-2 font-sans text-xs text-ink-soft">登记中…</p>}
        {state.status === "done" && (
          <p className="mt-2 break-all font-mono text-xs text-ink">已登记：{state.ossUrl}</p>
        )}
        {state.status === "failed" && (
          <p role="alert" className="mt-2 border border-ink px-3 py-2 font-sans text-xs text-ink">
            {state.message}
          </p>
        )}
      </div>
    </div>
  );
}
