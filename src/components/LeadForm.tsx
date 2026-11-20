/**
 * 文件：src/components/LeadForm.tsx
 * 描述：线索提交表单（客户端）：HTML 声明式校验 + 提交前复核，POST /api/lead；
 *       成功只展示通用回执，不回显任何敏感信息，不暴露后台入口
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 1.2）。限流与校验在服务端兜底，本组件只做
 *               客户端体验层校验与提交状态展示
 * - 2026-11-19: V5 Phase 2 收尾自检（负责人确认补齐②）：蜜罐 website 隐藏字段 +
 *               renderedAt 渲染时间戳（<3s 服务端拒收），正常用户不可见不受影响
 */
"use client";

import { useState } from "react";

const REQ_TYPES = ["需求咨询", "项目合作", "媒体采访", "其他"];

export function LeadForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [message, setMessage] = useState("");
  const [renderedAt] = useState(() => Date.now());

  async function handleSubmit(formData: FormData) {
    setStatus("sending");
    setMessage("");

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const reqType = String(formData.get("reqType") ?? "").trim();
    const messageText = String(formData.get("message") ?? "").trim();

    if (!name || !email || !reqType || !messageText) {
      setStatus("failed");
      setMessage("请把姓名、邮箱、需求类型与留言都填完整。");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("failed");
      setMessage("邮箱格式不对，请检查后重试。");
      return;
    }

    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        reqType,
        evidenceReq: String(formData.get("evidenceReq") ?? "").trim(),
        message: messageText,
        website: String(formData.get("website") ?? "").trim(),
        renderedAt: Number(formData.get("renderedAt") ?? 0),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok: boolean; error?: { message?: string } }
      | null;

    if (response.ok && payload?.ok) {
      setStatus("done");
      setMessage("已收到，我会尽快回复你。");
    } else {
      setStatus("failed");
      setMessage(payload?.error?.message ?? "提交没有完成，请稍后再试。");
    }
  }

  return (
    <form action={handleSubmit} className="mt-8 flex flex-col gap-4">
      <div
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden"
      >
        <label>
          网站地址（人不要填写）
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="h-0 w-0"
          />
        </label>
      </div>
      <input type="hidden" name="renderedAt" value={renderedAt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          姓名
          <input
            name="name"
            required
            maxLength={40}
            autoComplete="name"
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          邮箱
          <input
            name="email"
            type="email"
            required
            maxLength={100}
            autoComplete="email"
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
        需求类型
        <select name="reqType" defaultValue="" className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink">
          <option value="" disabled>
            请选择
          </option>
          {REQ_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
        希望留存哪些交付证据（可空）
        <input
          name="evidenceReq"
          maxLength={200}
          className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
        留言
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={5}
          className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
      </label>
      <div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="border border-ink px-5 py-2 font-sans text-sm text-ink hover:border-brown hover:text-brown disabled:opacity-50"
        >
          {status === "sending" ? "提交中…" : "提交线索"}
        </button>
      </div>
      {message && (
        <p
          role={status === "failed" ? "alert" : "status"}
          className={`border px-3 py-2 font-sans text-xs ${
            status === "failed" ? "border-ink text-ink" : "border-hairline text-ink-soft"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
