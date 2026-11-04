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
  CredentialsSignin: "口令不正确。",
  Verification: "登录链接已过期，请重新发起登录。",
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
