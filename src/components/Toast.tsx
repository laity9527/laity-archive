/**
 * 文件：src/components/Toast.tsx
 * 描述：后台操作回执：读取 URL 上的 saved/published/unpublished/deleted/error 参数，就地提示并清理地址
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（重构方案 V3 / B1-b）。此前所有操作回执只靠 ?saved=1 这类 URL 参数，
 *               提示混在页面里、刷新即重复、也无法自动消失；这里做成右下角浮层：
 *               成功 4.5 秒自动收起并 replace 掉查询串，错误保持到手动关闭（错误码可截图留证）
 * - 2026-11-16: 改为渲染期派生消息 + 只记"已关闭哪一条"：effect 里同步 setState 会被
 *               react-hooks/set-state-in-effect 判错（React Compiler 规则），
 *               而"参数 → 文案"本来就是纯映射，不需要再存一份 state
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { errorTextOf } from "@/lib/error-text";
import { IconAlert, IconCheck, IconClose } from "@/components/icons";

type Tone = "ok" | "error";

type Message = {
  tone: Tone;
  title: string;
  text: string;
};

// 成功类回执：键名与各 Server Action 的 redirect 参数一一对应（log-actions / project-actions / export）
const SUCCESS: Record<string, { title: string; text: string }> = {
  saved: { title: "已保存", text: "草稿已写入库；发布后才会出现在前台。" },
  published: {
    title: "已发布",
    text: "已按当前正文写入内容摘要与发布时间，前台立即可见。",
  },
  unpublished: {
    title: "已下架",
    text: "正文与历史摘要都保留，只是不再对访客显示。",
  },
  deleted: { title: "已删除", text: "这一条已从库中移除，无法撤销。" },
};

function formOf(pathname: string): "log" | "project" | undefined {
  if (pathname.startsWith("/admin/projects")) return "project";
  if (pathname.startsWith("/admin/logs")) return "log";

  return undefined;
}

export function Toast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const errorCode = params.get("error");
  const field = params.get("field") ?? undefined;
  const successKey = Object.keys(SUCCESS).find((key) => params.get(key) !== null);
  const bulkCount = params.get("bulkUnpublished");

  // 消息是参数到文案的纯映射：渲染期算，不存 state（也避免 effect 里同步 setState）
  const message = useMemo<Message | null>(() => {
    if (errorCode) {
      return {
        tone: "error",
        title: "操作未完成",
        // 错误码保留在正文里（截图留证要用），后面跟具体字段文案
        text: `${errorCode} · ${errorTextOf(errorCode, formOf(pathname), field)}`,
      };
    }

    if (bulkCount !== null) {
      return {
        tone: "ok",
        title: "已批量下架",
        text: `共下架 ${bulkCount} 条；正文与历史摘要都保留，只是不再对访客显示。`,
      };
    }

    if (successKey) {
      const entry = SUCCESS[successKey];

      return { tone: "ok", title: entry.title, text: entry.text };
    }

    return null;
  }, [bulkCount, errorCode, field, successKey, pathname]);

  // 只记"哪一条被关掉了"：参数变了 key 就变，旧记录自动失效，不需要 effect 里重置
  const messageKey = errorCode
    ? `e:${errorCode}:${field ?? ""}`
    : bulkCount !== null
      ? `b:${bulkCount}`
      : successKey
        ? `s:${successKey}`
        : "";
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const visible = message !== null && dismissedKey !== messageKey;

  // 成功类 4.5 秒自动收起；错误类保持到手动关闭。
  // setState 在定时器回调里（不是 effect 同步段），并同时清掉查询串，刷新不再重复提示
  useEffect(() => {
    if (!message || message.tone === "error") return;

    const timer = window.setTimeout(() => {
      setDismissedKey(messageKey);
      router.replace(pathname, { scroll: false });
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [message, messageKey, pathname, router]);

  if (!message || !visible) return null;

  function dismiss() {
    setDismissedKey(messageKey);
    router.replace(pathname, { scroll: false });
  }

  return (
    <div
      role={message.tone === "error" ? "alert" : "status"}
      aria-live={message.tone === "error" ? "assertive" : "polite"}
      className="fixed bottom-6 right-6 z-50 w-[min(92vw,360px)] border border-ink bg-paper p-4"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 shrink-0 text-ink">
          {message.tone === "error" ? (
            <IconAlert size={16} />
          ) : (
            <IconCheck size={16} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-xs text-ink">{message.title}</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">
            {message.text}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="关闭提示"
          className="shrink-0 border border-transparent p-0.5 text-ink-soft hover:border-ink hover:text-ink"
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  );
}
