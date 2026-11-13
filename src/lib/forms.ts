/**
 * 文件：src/lib/forms.ts
 * 描述：表单与查询参数的公共取值工具：searchParams 单值取值、FormData 字段读取、slug 校验规则
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 从 5 个页面与 2 个 Server Action 中收敛同名重复定义
 * - 2026-11-04: 补 ID_PATTERN / LIMITS / safeCallbackUrl（D26）：校验数字原先只活在 action 的 if 里，
 *               浏览器属性、服务端判定、测试三处各写一遍；回调判定的反斜杠漏项也要能被单测锁住
 * - 2026-11-12: 新增 normalizeTag（F26 标签聚合页归一化：trim + 空值/超长拒收，不解码不折叠，
 *               页面侧与 proxy 前置判定共用）
 * - 2026-11-12: 新增 decodeTagParam（F26 修正：App Router 实测向页面交付编码原样的 path 参数，
 *               入口解码一次，解码失败回退原值；与 normalizeTag 组合使用）
 * - 2026-11-12: 修正 normalizeTag 上方注释（I084 结案），改述为编码原样参数口径，函数体未动
 * - 2026-11-13: 新增 parseTagList/normalizeTagList（写入时收口：去 @ 前缀、忽略大小写去重、空值剔除）；
 *               LIMITS.tags 10 → 5（现有 33 条日志最多 5 个，无超限存量）
 */

// ?error= / ?saved= 这类参数被框架给成数组时按缺省处理，只认非空字符串
export function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// 标签聚合页归一化（F26）：App Router 交付编码原样的 path 参数（双编码探针证实），
// 调用方须先经 decodeTagParam 解码一次（解码失败回退原值交本函数拒收），
// 本函数只做 trim 与空值/超长拒收，不做解码。
export function normalizeTag(value: string): string | null {
  const tag = value.trim();

  if (tag.length === 0 || tag.length > LIMITS.tag) {
    return null;
  }

  return tag;
}

// App Router 实测向页面交付编码原样的 path 参数（dev 双编码探针证实），入口需解码一次；
// 解码失败回退原值交 normalizeTag 拒收。try/catch 写法在两种环境下都安全：参数若已被解码，
// 解码要么恒等、要么遇字面 % 抛错回退，不会损坏合法标签
export function decodeTagParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 写入时的标签收口（标签治理 §三）：去首尾空白与开头的 @，忽略大小写去重（保留第一次出现的写法），
 * 空值剔除。数组入口给 saveLog 用，覆盖表单与 GitHub 同步两条写入路径；
 * 条数上限由动作层用 LIMITS.tags 校验，本函数不静默截断。
 */
export function normalizeTagList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of values) {
    const tag = raw.trim().replace(/^@+/, "").trim();

    if (!tag) {
      continue;
    }

    const key = tag.toLocaleLowerCase("zh-CN");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

/** 表单字符串入口：按中英文逗号拆分后走同一套数组归一化。 */
export function parseTagList(raw: string): string[] {
  return normalizeTagList(raw.split(/[,，]/));
}

export function readField(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

// HTML 的 pattern 属性按 `v` flag 编译，类名里尾随的 - 在其中是非法字符类，必须转义；
// 所以这一份是"能同时喂给 RegExp 和 pattern 属性"的写法，服务端判定直接由它派生
export const SLUG_SOURCE = "[a-z0-9][a-z0-9\\-]{1,63}";
export const SLUG_PATTERN = new RegExp(`^${SLUG_SOURCE}$`);

// 同上一条坑：HTML 的 pattern 属性要的是"单个反斜杠"的源串，
// 而 JSX 里写 attr="...\\S..." 是原样两个反斜杠，等于要求 URL 里真有一个反斜杠——
// 真实仓库地址会被浏览器静默拒掉（表单不提交、也没有任何提示）。
// 所以正则也只从这一份派生，两侧共用
export const REPO_URL_SOURCE = "https?://\\S+";
export const REPO_URL_PATTERN = new RegExp(`^${REPO_URL_SOURCE}$`);

// 库里的主键是 cuid（小写字母数字）；表单里来的 id 先按形状挡一道，
// 免得 "../"、带空格、超长串被原样拼进 redirect 目标或送去查库
export const ID_PATTERN = /^[a-z0-9]{1,64}$/;

// 上限一处定义：服务端校验、HTML 的 maxLength 与测试对拍共用同一份数字
export const LIMITS = {
  title: 120,
  tags: 5,
  tag: 24,
  lesson: 500,
  projectName: 80,
  projectSummary: 200,
} as const;

// 登录回调只认本站相对路径。挡三种跳外站的写法：协议相对 `//host`、
// 反斜杠开头的 `/\host`（WHATWG 解析把反斜杠当路径分隔符，等价于 //host）、以及不含冒号的绝对形式
export function safeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/admin";
  }

  if (value.startsWith("//") || /^\/[\\/.]/.test(value) || value.includes("\\")) {
    return "/admin";
  }

  return value;
}
