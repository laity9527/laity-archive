/**
 * 文件：src/components/SubmitButton.tsx
 * 描述：表单提交按钮：提交进行中禁用自身并换文案，避免同一个写动作被连点成多次执行
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（后台七个写动作按钮共用）
 */
"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
};

export function SubmitButton({
  label,
  pendingLabel = "提交中…",
  className,
}: SubmitButtonProps) {
  // useFormStatus 读的是包裹它的 <form> 的提交状态，所以它必须渲染在表单内部
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending ? true : undefined}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
