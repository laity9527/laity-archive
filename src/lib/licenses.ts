/**
 * 文件：src/lib/licenses.ts
 * 描述：第三方依赖与字体的许可清单，供 /licenses 页展示；许可证值取自各包 node_modules 的 package.json 实测
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 *  - 2026-11-03: 初始创建（合规方案 7.1 开源致谢落地）。18 个直接依赖的 license 字段逐个从 node_modules 读出后登记，
 *                不凭记忆填写；tests/licenses.test.ts 会核对"每个依赖都在表里"与"许可不落在禁用集合内"
 * - 2026-11-04: next-auth 的用途与商标声明随 D20 改为口令登录口径
 * - 2026-11-11: 负责人完成上游 LICENSE 复核（I040 结案）：Inter / Noto Serif SC 为 SIL Open Font License 1.1、
 *                JetBrains Mono 为 Apache License 2.0，均允许免费商用。FONT_LICENSES 的值本就与上游一致，
 *                本轮不改值，仅登记复核事实；/licenses 页同步移除"本次未联网复核"免责提示
 */

export type DependencyLicense = {
  name: string;
  license: string;
  // 一句话说明它在本项目里干什么，致谢页不该只有一串名字
  purpose: string;
};

// 直接依赖（dependencies + devDependencies）。license 值与 node_modules/<包>/package.json 一致（2026-11-03 实测）
export const DEPENDENCY_LICENSES: DependencyLicense[] = [
  { name: "next", license: "MIT", purpose: "应用框架与路由（App Router）" },
  { name: "react", license: "MIT", purpose: "视图层" },
  { name: "react-dom", license: "MIT", purpose: "React 的 DOM 渲染器" },
  { name: "next-auth", license: "ISC", purpose: "后台登录（管理员口令与会话）" },
  { name: "@prisma/client", license: "Apache-2.0", purpose: "数据库访问层" },
  { name: "prisma", license: "Apache-2.0", purpose: "schema 与迁移工具（开发期）" },
  { name: "tailwindcss", license: "MIT", purpose: "样式工具类" },
  { name: "@tailwindcss/turbopack", license: "MIT", purpose: "Tailwind 的 Turbopack 接入" },
  { name: "react-markdown", license: "MIT", purpose: "日志正文 Markdown 渲染" },
  { name: "rehype-sanitize", license: "MIT", purpose: "渲染前的 HTML 白名单消毒（防 XSS）" },
  { name: "ali-oss", license: "MIT", purpose: "正文插图上传到对象存储" },
  { name: "typescript", license: "Apache-2.0", purpose: "类型系统与编译（开发期）" },
  { name: "eslint", license: "MIT", purpose: "静态检查（开发期）" },
  { name: "eslint-config-next", license: "MIT", purpose: "Next 官方 ESLint 配置（开发期）" },
  { name: "@types/node", license: "MIT", purpose: "Node 类型定义（开发期）" },
  { name: "@types/react", license: "MIT", purpose: "React 类型定义（开发期）" },
  { name: "@types/react-dom", license: "MIT", purpose: "React DOM 类型定义（开发期）" },
  { name: "@types/ali-oss", license: "MIT", purpose: "ali-oss 类型定义（开发期）" },
];

// 字体不随仓库分发，由 next/font 在构建期从 Google Fonts 拉取并自托管产物
export const FONT_LICENSES: DependencyLicense[] = [
  { name: "Inter", license: "SIL Open Font License 1.1", purpose: "界面字体" },
  { name: "Noto Serif SC", license: "SIL Open Font License 1.1", purpose: "日志正文（思源宋体）" },
  { name: "JetBrains Mono", license: "Apache License 2.0", purpose: "时间戳与标签（等宽）" },
];

export const TRADEMARK_NOTE =
  "GitHub 是 GitHub, Inc. 的注册商标。本项目不接入 GitHub 登录，提到这个名称只用于说明代码仓库所在位置与发布前扫描的凭据形态，与 GitHub, Inc. 不存在赞助、背书或隶属关系。页面中出现的其他产品名称、商标与品牌均为其各自所有者的财产，本项目不主张任何相关权利。";

// AGENTS.md 的依赖许可红线：GPL / AGPL 等传染性许可一律禁止。清单里出现下列前缀即判不合格
export const FORBIDDEN_LICENSE_PREFIXES = ["GPL", "AGPL", "LGPL", "CC-BY-NC", "SSPL"];
