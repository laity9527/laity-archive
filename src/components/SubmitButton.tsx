/**
 * 文件：src/components/SubmitButton.tsx
 * 描述：表单提交按钮：提交进行中禁用自身并换文案，避免同一个写动作被连点成多次执行
 * 作者：张磊
 * 创建日期：2026-11-04
 * 修改记录：
 * - 2026-11-04: 初始创建（后台七个写动作按钮共用）
 * - 2026-11-04: 加 formAction 透传：发布按钮要和表单字段同处一张表单（D25），
 *               靠 per-button formAction 指向另一个 Server Action，不必拆成两张表单
 * - 2026-11-04: 加 confirmLabel：破坏性动作改为"再点一次"两步生效，第二次点击才提交并带上确认位（D26）
 * - 2026-11-09: 加 confirmMessage：点击先弹原生 window.confirm，取消即阻止提交；该分支的确认位恒为 on
 *               （服务端 PRJ_003 闸门不动，防手滑职责由弹窗承担），与 confirmLabel 两步分支互斥
 */
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  formAction?: string | ((formData: FormData) => void | Promise<void>);
  // 给了它就走两步：第一次点击只把文案换成这句、不提交；第二次才真提交
  confirmLabel?: string;
  // 给了它就在点击时弹原生确认框，点取消即阻止提交；与 confirmLabel 互斥，调用方只给其一
  confirmMessage?: string;
};

export function SubmitButton({
  label,
  pendingLabel = "提交中…",
  className,
  formAction,
  confirmLabel,
  confirmMessage,
}: SubmitButtonProps) {
  // useFormStatus 读的是包裹它的 <form> 的提交状态，所以它必须渲染在表单内部。
  // 同一张表单里的多个动作按钮因此会同时禁用——这正是要的：不允许并发写；
  // 副作用是两者的待命文案同时出现，只在请求在途的几百毫秒内可见（D25 记录该边界）
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);
  const twoStep = confirmLabel !== undefined;

  return (
    <>
      {/* 确认位随按钮状态走：服务端要求它等于 on 才执行，缺了就回 PRJ_003 */}
      {twoStep && (
        <input type="hidden" name="confirmDelete" value={armed ? "on" : ""} />
      )}
      {/* 弹窗分支的确认位恒为 on：防手滑职责已由原生弹窗承担，PRJ_003 闸门保持原样 */}
      {confirmMessage !== undefined && (
        <input type="hidden" name="confirmDelete" value="on" />
      )}
      <button
        type="submit"
        formAction={formAction}
        onClick={(event) => {
          if (confirmMessage !== undefined) {
            if (!window.confirm(confirmMessage)) {
              event.preventDefault();
            }

            return;
          }

          if (!twoStep || armed) {
            return;
          }

          event.preventDefault();
          setArmed(true);
        }}
        disabled={pending}
        aria-busy={pending ? true : undefined}
        className={className}
      >
        {pending
          ? pendingLabel
          : twoStep && armed
            ? confirmLabel
            : label}
      </button>
    </>
  );
}
