/**
 * 文件：src/lib/error-text.ts
 * 描述：错误码到用户文案的唯一映射表，供后台各页与登录页共用；VAL_001 因表单不同给不同细则
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 合并原先散在 5 处的文案表；AUTH_001 统一成"会话已失效，请重新登录后再试。"
 * - 2026-11-03: 补 LOG_003（发布前敏感信息确认门）与 LOG_004（删除需回填 slug 确认）
 * - 2026-11-04: 登录改本地口令：删 AccessDenied（GitHub 白名单专用），补 CredentialsSignin，Configuration 不再指 OAuth
 * - 2026-11-04: 补逐字段文案与 PRJ_003；Configuration 不再念出环境变量名（D26）——这一行会渲染在公开的
 *               /login 上，任何人敲 ?error=Configuration 就能看到本站配了哪些密钥变量
 * - 2026-11-10: V2.0 Step 5 Commit 2：补 SYNC_001/002/003（未绑定/授权失效/GitHub 不可达）
 * - 2026-11-10: Step 5 修复轮：SYNC_002 文案改为"授权不足，请重新登录"；scope 补 public_repo
 * - 2026-11-10: V2.0 文档口径收口（I078）：删口令时代的 CredentialsSignin 与仅 email provider 用的
 *               Verification（均为死码），按 next-auth v4 源码补 OAuthSignin/AccessDenied/OAuthCallback/
 *               OAuthCreateAccount/OAuthAccountNotLinked/Callback 六个码
 * - 2026-11-10: Step 6 Commit 2：补 AI_001（生成失败/超时/解析失败，降级保留「（等待补充）」）/
 *               AI_002（单次 Commit 条数超 F22 的 12 条上限）
 * - 2026-11-12: F25 全站数据导出：补 EXPORT_001（查库或组装异常，概览横幅兜底）
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
  PRJ_003: "删除没有执行：请再点一次「确认删除」。",
  PRJ_004: "项目不存在，可能已被删除。",
  IMG_001: "图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。",
  SYNC_001: "尚未绑定 GitHub 授权：请退出并重新登录一次，再点同步。",
  SYNC_002: "同步失败：GitHub 授权不足，请先退出登录，重新授权以获取仓库读取权限。",
  SYNC_003: "暂时连不上 GitHub，请稍后再试。",
  // Step 6 / F22：AI 辅助生成的动作结果码（AI_001 全局降级、AI_002 输入超限）
  AI_001: "AI 生成失败，请稍后重试或手动补全。",
  AI_002: "单次最多处理 12 条 Commit，请分次生成。",
  // F25 全站数据导出的动作结果码（查库或组装异常）
  EXPORT_001: "导出失败，请稍后重试。",
  // NextAuth v4 OAuth 链路实际会回跳的码（core/routes/signin.js 与 callback.js 实查）
  OAuthSignin: "发起 GitHub 登录失败，请稍后再试。",
  AccessDenied: "GitHub 授权被拒绝或已取消。",
  OAuthCallback: "GitHub 登录回调处理失败，请再试一次。",
  OAuthCreateAccount: "账号建立失败，请稍后再试或查看服务端日志。",
  OAuthAccountNotLinked: "该 GitHub 账号与已有账号的绑定发生冲突，请联系站主。",
  Callback: "登录回调没有完成，可以再试一次。",
  Configuration: "登录没有配好，服务器侧缺少必需的密钥或地址，请查看服务端日志。",
  Default: "登录没有完成，可以再试一次。",
};

// 这里用相对路径带扩展名，而不是项目里通行的 @/lib：`npm test` 是 node --test 直跑 TS，
// 它不读 tsconfig 的 paths，@/ 别名会解析失败；同 prisma/seed.ts 引 content-hash 的处理（I027）
import { LIMITS } from "./forms.ts";

// VAL_001 的细则取决于出错的是哪张表单，不能合成一句
const VAL_001_TEXT: Record<"log" | "project", string> = {
  log: `参数不合法：标题必填（≤${LIMITS.title} 字）、slug 用小写字母数字连字符、BEFORE 不能为空、AFTER 不早于 BEFORE。`,
  project: "参数不合法：slug 只能用小写字母、数字与连字符（2–64 位），名称必填。",
};

export type LogField =
  | "id"
  | "project"
  | "slug"
  | "title"
  | "tags"
  | "beforeDate"
  | "afterDate"
  | "beforeContent"
  | "lessonLearned";

export type ProjectField = "slug" | "name" | "kind" | "status" | "summary" | "repoUrl";

// 服务端把 VAL_001 拆到具体字段后经 ?field= 回传，页面据此标住那个控件；
// 每条文案只说这一处怎么改，不复述整张表单的规则
// 键类型是联合，但 field 来自 URL（是 string），所以查表走下面的窄函数；
// 表本身仍按完整字段联合声明，少写一条文案就直接编译不过
const VAL_FIELD_TEXT: {
  log: Record<LogField, string>;
  project: Record<ProjectField, string>;
} = {
  log: {
    id: "这条记录的标识不合法，回概览重新进入编辑页。",
    project: "请选择一个存在的项目——列表里找不到你要的那个，先去项目管理建一条。",
    slug: "slug 要小写字母开头，只用字母、数字与连字符，2–64 位。",
    title: `标题必填，且不超过 ${LIMITS.title} 字。`,
    tags: `标签最多 ${LIMITS.tags} 个，单个不超过 ${LIMITS.tag} 字。`,
    beforeDate: "BEFORE 日期没填或不是可解析的时间。",
    afterDate: "AFTER 日期要能解析，且不早于 BEFORE。",
    beforeContent: "BEFORE 正文不能为空。",
    lessonLearned: `经验总结不超过 ${LIMITS.lesson} 字。`,
  },
  project: {
    slug: "slug 只能用小写字母、数字与连字符（2–64 位）。",
    name: `名称必填，且不超过 ${LIMITS.projectName} 字。`,
    kind: "类型不在允许的取值里。",
    status: "状态不在允许的取值里。",
    summary: `简介不超过 ${LIMITS.projectSummary} 字。`,
    repoUrl: "仓库地址要写成 http 或 https 的完整链接。",
  },
};

// URL 里的 field 是任意字符串，只能这样查一次：命中就给具体文案，不命中由调用方回落整句
function fieldText(form: "log" | "project", field: string): string | undefined {
  const table = VAL_FIELD_TEXT[form] as Readonly<Record<string, string>>;

  return table[field];
}

export function errorTextOf(
  code: string,
  form?: "log" | "project",
  field?: string,
): string {
  if (code === "VAL_001") {
    const perField = form && field ? fieldText(form, field) : undefined;

    if (perField) {
      return perField;
    }

    return form ? VAL_001_TEXT[form] : "参数不合法，请检查表单。";
  }

  return ERROR_TEXT[code] ?? code;
}

// 后台横幅会把 ?error= 的值原样打成一枚码标签（截图留证要用）。但 URL 是任何人可改的，
// 未知码不该回显到管理页上——已知码照打，其余一律换成中性标签
export function errorCodeChip(code: string): string {
  const known = code === "VAL_001" || Object.prototype.hasOwnProperty.call(ERROR_TEXT, code);

  return known ? code : "未收录的错误码";
}
