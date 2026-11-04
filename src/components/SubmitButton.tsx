/**
 * 文件：src/components/SubmitButton.tsx
 * 描述：表单提交按钮：提交进行中禁用自身并换文案，避免同一个写动作被连点成多次执行
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（后台七个写动作按钮共用）
 * - 2026-11-04: 加 formAction 透传：发布按钮要和表单字段同处一张表单（D25），
 *               靠 per-button formAction 指向另一个 Server Action，不必拆成两张表单
 */
"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  formAction?: string | ((formData: FormData) => void | Promise<void>);
};

export function SubmitButton({
  label,
  pendingLabel = "提交中…",
  className,
  formAction,
}: SubmitButtonProps) {
  // useFormStatus 读的是包裹它的 <form> 的提交状态，所以它必须渲染在表单内部。
  // 同一张表单里的多个动作按钮因此会同时禁用——这正是要的：不允许并发写；
  // 副作用是两者的待命文案同时出现，只在请求在途的几百毫秒内可见（D25 记录该边界）
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-busy={pending ? true : undefined}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
