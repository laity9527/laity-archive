/**
 * 文件：src/lib/error-text.ts
 * 描述：错误码到用户文案的唯一映射表，供后台各页与登录页共用；VAL_001 因表单不同给不同细则
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 合并原先散在 5 处的文案表；AUTH_001 统一成"会话已失效，请重新登录后再试。"
 * - 2026-11-03: 补 LOG_003（发布前敏感信息确认门）与 LOG_004（删除需回填 slug 确认）
 * - 2026-11-04: 登录改本地口令：删 AccessDenied（GitHub 白名单专用），补 CredentialsSignin，Configuration 不再指 OAuth
 */

export const ERROR_TEXT: Record<string, string> = {
  AUTH_001: "会话已失效，请重新登录后再试。",
  LOG_001: "slug 已被占用，换一个。",
  LOG_002: "日志不存在，可能已被删除。",
  LOG_003:
    "正文里有疑似敏感信息（手机号、身份证号、密钥、内网地址等）。请先核对并删改；确认无误再勾选「已核对，仍要发布」。",
  LOG_004: "删除没有执行：确认框里要原样填入这条日志的 slug。",
  PRJ_001: "该项目下还有日志，禁止删除。",
  PRJ_002: "slug 已被占用，换一个。",
  IMG_001: "图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。",
  CredentialsSignin: "口令不正确。",
  Verification: "登录链接已过期，请重新发起登录。",
  Configuration: "登录配置有误：检查 NEXTAUTH_SECRET 与 NEXTAUTH_URL。",
  Default: "登录没有完成，可以再试一次。",
};

// VAL_001 的细则取决于出错的是哪张表单，不能合成一句
const VAL_001_TEXT: Record<"log" | "project", string> = {
  log: "参数不合法：标题必填（≤120 字）、slug 用小写字母数字连字符、BEFORE 不能为空、AFTER 不早于 BEFORE。",
  project: "参数不合法：slug 只能用小写字母、数字与连字符（2–64 位），名称必填。",
};

export function errorTextOf(code: string, form?: "log" | "project"): string {
  if (code === "VAL_001") {
    return form ? VAL_001_TEXT[form] : "参数不合法，请检查表单。";
  }

  return ERROR_TEXT[code] ?? code;
}
