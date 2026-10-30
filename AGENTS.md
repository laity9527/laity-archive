# 项目事实（AI 必读，违反即返工）

项目：Laity 项目档案库（个人全栈数字档案库：厂牌官网 + 开发复盘证据链）
负责人：张磊
本文件维护人：张磊（AI 不得自行修改本文件；发现事实过期，停下来向我报告）

---

## 技术栈锁定（不可替换，不建议升级）

- 前端/全栈：Next.js（App Router）+ TypeScript
- 样式：Tailwind CSS（禁止引入其他 UI 组件库、CSS 框架、图标库）
- ORM：Prisma（provider 固定为 postgresql）
- 数据库：PostgreSQL 16（Docker 容器，库名 laity）
- 登录：NextAuth.js（后台 /admin 用，仅此一处）
- 包管理：npm（禁止 pnpm/yarn/bun）

### 版本事实（最高优先级）

- 本项目使用的 Next.js 版本与旧版（如 14）存在 breaking changes：API、约定、
  文件结构都可能不同。**写任何 Next.js 代码前，必须先读
  node_modules/next/dist/docs/ 下的对应指南，禁止凭训练记忆使用旧 API。**
- 本地尚未安装依赖（截至 2026-10-30 仓库无 node_modules）。在依赖装好之前，
  任何"已验证能跑"的表述都不成立，产出必须标注"未验证"。
- `next dev` 会自动向本文件写入版本警告块。该块被重新生成属于正常现象，
  不要从 diff 中删除它；连同你的改动一起提交即可。

## 环境实况（方案必须适配，不许假设理想环境）

- 本地环境现状：无 Node、无 Docker、无数据库（截至 2026-10-30）。
- 降级工作流：AI 输出完整文件（完整路径 + 完整内容）→ 我通过 GitHub 网页端
  （Add file → Create new file）手动入库 → 本地环境就绪后回头验证这批产物。
- GitHub 仓库：https://github.com/laity9527/laity-archive
- 降级期的替代验证：语法自查、GitHub 网页预览；不许把"看起来没问题"写成"测试通过"。

## 目录与命名约定

```
laity-archive/
├── AGENTS.md                # 本文件：事实基座
├── docs/
│   ├── 00-开发方法论/       # 工作法与决策记录
│   ├── 01-研发日志/         # 每日：指令原文、思考、踩坑（现象→根因→修复）
│   ├── 02-测试记录/         # 功能自测表
│   ├── 03-功能截图/         # 真实运行截图（必须带地址栏）
│   └── 04-软著材料/         # 源代码文档、说明书
├── prisma/
│   └── schema.prisma        # 数据模型（Project / Log）
├── src/
│   ├── app/                 # 页面路由（App Router）
│   ├── components/          # 核心组件（时间轴、状态灯等）
│   └── lib/                 # 工具函数（Prisma 实例、Hash 计算、getSafeLogs）
└── docker-compose.yml       # 本地 PostgreSQL 容器
```

- 页面放 src/app/<路由>/page.tsx；可复用组件放 src/components/；
  数据访问与工具函数放 src/lib/，页面内禁止直接 new PrismaClient。
- 过程性文档一律进 docs/ 对应子目录，不许散落根目录。

## 视觉铁律（精确值，违反即返工）

- 色彩：背景 #FBFBF9（纸白）/ 主字 #131313（纯墨）/ 辅助字 #5C5C5C / 极细线 #E7E7E2
- 形态：border-radius: 0（全局零圆角）；box-shadow: none（无阴影）；无渐变
- 字体：UI 用 Inter；日志正文强制 Noto Serif SC（思源宋体，18px / 行高 1.85）；
  时间戳与标签强制 JetBrains Mono（等宽，font-mono）
- 图标：禁用一切图标库，只允许字符（↗ ← ● ○）
- 版式：内容最大宽 1080px；日志详情限宽 720px；
  日志列表左侧 200px BEFORE/AFTER 时间轴（1px 竖线贯穿）
- 自查方式：交付前 grep 自己的产出，出现 rounded-（非 rounded-none）、
  shadow-（非 shadow-none）、bg-gradient、图标库 import 即自行返工

## 数据与存证约定

- Log 模型关键字段：beforeContent / afterContent（Markdown）、
  beforeDate / afterDate（双时间戳）、isPublished（默认 false，草稿隔离）、
  contentHash（发布时 SHA-256）、publishedAt（服务器时间）
- 发布动作必须同时：计算正文 SHA-256 写入 contentHash、记录服务器时间，
  两者缺一不可
- 时间一律存 UTC，展示层再做时区转换，禁止存本地时间字符串

## 合规与安全红线

- 依赖许可：MIT / Apache / BSD 可用；GPL / AGPL 传染性许可一律禁止，引入前必查
- 字体只用开源许可（SIL OFL / Apache 2.0）：Inter、Noto Serif SC、JetBrains Mono
- 图片素材只用免版权图库（Unsplash / Pexels），避让人脸与商标
- 前台数据访问只能走 src/lib 的 getSafeLogs() 类封装（内部强制 isPublished: true），
  禁止页面直接查询 Log 表
- Markdown 渲染必过 rehype-sanitize（防 XSS），禁止 dangerouslySetInnerHTML 裸渲染
- 上传图片禁止落服务器本地，通过 Server Action 转发阿里云 OSS 返回外链
- 数据库口令：本地开发容器的弱口令仅限本地；上线前必须更换，
  生产凭据一律走环境变量，禁止写进仓库

## 通用红线（任何 Phase 都不得触碰）

- 不得修改 build 配置、CI 配置、lockfile
- 不得顺手重构本任务范围外的代码；范围外问题记 ISSUES.md，不动手
- 不得新增依赖；确需新增，停下列出理由（含许可证）等我批准
- 数据库变更只改 prisma/schema.prisma 并生成迁移文件，不得直接对库执行
- 每个 Phase 只做该 Phase；禁止"顺便"提前实现后续 Phase

## 文件头注释铁律（软著留痕，优先级高于"少写注释"的通用习惯）

每个手写或经我要求修改的 .ts / .tsx 文件，顶部必须有：

```tsx
/**
 * 文件：[文件名]
 * 描述：[组件或函数的具体作用]
 * 作者：张磊
 * 创建日期：2026-xx-xx
 * 修改记录：
 * - 2026-xx-xx: [本次改动一句话]
 */
```

修改已有文件时追加修改记录行，不许覆盖历史记录。

## 验证命令（验收唯一依据）

本地环境就绪前，以下命令为规划值，执行不了的验收项标注"未验证 + 替代验证方式"：

- 安装：npm install
- 数据库：docker compose up -d（postgres:16，端口 5432，库名 laity）
- 开发：npm run dev（访问 http://localhost:3000）
- 检查：npm run lint
- 构建：npm run build
- Prisma：npx prisma migrate dev（迁移）/ npx prisma studio（查库）

## 工作方式（对 AI 的行为要求）

- 遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md 的五层防线与门禁流程
- 每个任务开工先复述范围与允许触碰的文件清单，等我确认
- 交付：完整路径 + 完整文件内容，不许片段
- 验收：粘贴实际执行的命令与真实输出；没执行的标"未验证"
- 信息不足：最多问 3 个阻塞性问题；能查代码/本文件得到答案的不许问我
- 遇到规格歧义、需改配置或依赖、验收达不成：立即停下问我。
  停下来问是正确行为，不是失败；禁止用编造填补不确定性
- 每次交付末尾附 100 字以内研发日志素材（决策/坑/解法），由我存入 docs/01-研发日志