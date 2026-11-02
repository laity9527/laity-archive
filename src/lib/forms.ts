/**
 * 文件：src/lib/forms.ts
 * 描述：表单与查询参数的公共取值工具：searchParams 单值取值、FormData 字段读取、slug 校验规则
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 从 5 个页面与 2 个 Server Action 中收敛同名重复定义
 */

// ?error= / ?saved= 这类参数被框架给成数组时按缺省处理，只认非空字符串
export function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readField(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
