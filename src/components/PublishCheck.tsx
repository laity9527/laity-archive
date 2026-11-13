/**
 * 文件：src/components/PublishCheck.tsx
 * 描述：编辑器的实时发布检查：监听表单输入，更新标题/BEFORE/标签/阅读时长/敏感扫描/摘要状态
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建（Phase C 编辑器）。原先检查读的是库里已保存值，改完正文仍显示旧结论；
 *               本组件用 FormData 读当前表单，随 input/change 更新。服务端仍是唯一判据。
 */
"use client";

import { useEffect, useState } from "react";
import { estimateReadingMinutes } from "@/lib/reading-time";
import { scanSensitive } from "@/lib/sensitive-scan";

export type PublishCheckInitial = {
  title: string;
  beforeContent: string;
  afterContent: string;
  lessonLearned: string;
  tags: string;
  hasHash: boolean;
};

type PublishCheckProps = {
  formId: string;
  initial: PublishCheckInitial;
};

function readValue(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function PublishCheck({ formId, initial }: PublishCheckProps) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const read = () => {
      const data = new FormData(form);

      setState({
        title: readValue(data, "title"),
        beforeContent: readValue(data, "beforeContent"),
        afterContent: readValue(data, "afterContent"),
        lessonLearned: readValue(data, "lessonLearned"),
        tags: readValue(data, "tags"),
        hasHash: initial.hasHash,
      });
    };

    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);

    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [formId, initial.hasHash]);

  const titleOk = state.title.trim().length > 0;
  const beforeOk = state.beforeContent.trim().length > 0;
  const tags = state.tags
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const minutes = estimateReadingMinutes(
    [state.beforeContent, state.afterContent, state.lessonLearned].join("\n"),
  );
  const blocking = scanSensitive(
    [state.title, state.beforeContent, state.afterContent, state.lessonLearned]
      .filter(Boolean)
      .join("\n"),
  ).filter((hit) => !hit.advisory).length;

  return (
    <div className="border border-hairline px-4 py-3 md:col-span-2">
      <p className="font-sans text-[10px] text-ink-soft">
        发布检查 · 随输入更新
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-sans text-[11px] text-ink-soft">
        <li>标题 {titleOk ? "✓" : "缺失"}</li>
        <li>BEFORE 正文 {beforeOk ? "✓" : "缺失"}</li>
        <li>标签 {tags.length} 个</li>
        <li>{minutes > 0 ? `约 ${minutes} 分钟读完` : "正文为空"}</li>
        <li>
          敏感扫描 {blocking === 0 ? "0 类阻断" : `${blocking} 类阻断`}
        </li>
        <li>{state.hasHash ? "摘要将在发布时重算" : "发布时生成摘要"}</li>
      </ul>
      <p className="mt-2 font-sans text-[10px] text-ink-soft">
        服务端保存时仍会再校验一次。
      </p>
    </div>
  );
}
