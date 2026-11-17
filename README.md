
# Laity 项目档案库

**一句话定位**：多租户的开发者数字档案库——用极简纸白排版展示成果，用 Before/After 开发日志承载复盘，发布时自动写入 SHA-256 内容摘要，并支持 GitHub 提交自动同步与 AI 辅助撰写。

数字档案，记录每一次工程决策。收集项目作品与开发复盘，构建一份可信的数字履历。

当前形态：**V2.2 多租户 + V3/V3.1 阅读与写作升级**（GitHub OAuth 一键登录，各账号读写独立隔离；无自建注册、无 UGC；含 GitHub 提交自动同步、AI 辅助生成、系列/快照/反向引用、Markdown 导入与 RSS 订阅）。现行事实见 [docs/现状说明书.md](file:///D:/ZHANGLEI/laity-archive/docs/%E7%8E%B0%E7%8A%B6%E8%AF%B4%E6%98%8E%E4%B9%A6.md)。

## 当前状态快照（2026-11-17）

| 维度 | 状态 |
|---|---|
| 阶段进度 | **V2.2 多租户 + V3 界面/后台升级 + V3.1 写作闭环**：多租户、GitHub 同步、AI 辅助、搜索/导出/标签/RSS 已上线；V3 完成令牌、首页/详情、后台与发现路径；V3.1 完成系列（字段/系列页/索引/联想）、上次发布快照、正文内链与“被引用”、Markdown 导入与公开预览链接（24h 哈希 token） |
| 回归测试 | `npm test` **249 条全绿**（Node 自带 test runner，零测试依赖；只测纯逻辑） |
| 四道门禁 | `npm run lint` / `npx tsc --noEmit` / `npm run build` / `npm test` 全 0；CI 同序代跑 |
| 数据实况 | 生产环境已接入多账号 GitHub 登录，数据物理隔离；第一条真实数据为本项目自身 |
| 数据库迁移 | 本地已应用最近三条：`add_log_series`、`add_published_snapshot`、`add_preview_token`；服务器随部署执行 `prisma migrate deploy` |
| 依赖审计 | 2026-11-17 经批准切官方源执行 `npm audit`：11 个漏洞（8 moderate / 3 high），修复需升级锁定版本（next 16.4.6 / eslint 链），未自动升级，待负责人决定 |
| 自动化交付 | 已接入 **GitHub Actions 自动部署**：push 到 `main` 且门禁通过后，自动 SSH 至服务器备份、构建、迁移与健康校验 |
| 文档体系 | 现行事实为 `docs/现状说明书.md`；旧 SPEC / DESIGN / ISSUES 已封存到 `docs/archive/2026-11-16-旧编号体系/`（仅查历史，不作实现依据） |

## 技术栈

Next.js 16.4.3（App Router + RSC + PPR）· TypeScript 5.9.3 · Tailwind CSS 4.3.3 · Prisma 6.19.3 · PostgreSQL 16（Docker）· next-auth 4.24.15（**GitHub OAuth 一键登录**）· 阿里云 OSS（图片外链）· 阿里通义千问 / DeepSeek（OpenAI 兼容协议）

版本均为**实测值且属锁定项**，不建议升级、不可替换；写 Next.js 代码前必须先读 `node_modules/next/dist/docs/` 对应指南。

## 环境要求

- Node.js ≥ v22（本机实测 Node v24.13.0 + npm 11.6.2）
- Docker Desktop + 本地 PostgreSQL 16 容器（库名 `laity`）
- 端口：应用 3000、数据库 5432
- 包管理固定 npm（禁 pnpm / yarn / bun）
- 真实 `.env` / `.env.production` 由负责人本人填写与维护；模板见 `.env.example` 与 `.env.production.example`（**新增了 `AI_API_KEY`、`ENCRYPTION_KEY` 等必填项**）

## 快速开始

```bash
npm ci                        # 用锁文件原样安装
docker compose up -d          # 启动本地 PostgreSQL 16
npx prisma migrate dev        # 建表
npx prisma db seed            # 本地种子数据
npm run dev                   # http://localhost:3000
```

后台入口 `http://localhost:3000/admin`，未登录会跳自建登录页 `/login`，点 **「使用 GitHub 登录」** 完成 OAuth 授权。

> Windows + Git Bash 三个已踩过的坑见 [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md)「已知坑速查」：
> MSYS 会改写容器内路径、Node 眼里的 `/tmp` 不是 Git Bash 的那个、管道尾接 `| head` 会让退出码变假红。

## 自动化流水线与发版门禁

四条本地门禁全 0 才算可发版：
```bash
npm run lint && npx tsc --noEmit && npm run build && npm test
```

GitHub Actions 包含两条工作流：
1. **`ci.yml`（发版门禁）**：每次 push 与 PR 时运行，含软著材料两步自检。
2. **`deploy.yml`（生产部署）**：当 `ci.yml` 在 `main` 分支通过后自动触发。通过 SSH 连接服务器，执行 `pg_dump` 备份 → 构建镜像 → `migrate deploy` → 重启服务 → 轮询 `/api/health`。健康失败自动回滚上一版镜像。

`npm test` 覆盖纯逻辑：摘要口径、对象名断言、敏感信息扫描、开源许可、Token 加密、Prompt 解析、同步过滤、系列进度、快照解析、内链切分与归档分组等。

## 文档导读（新开发者按这个顺序读）

| 顺序 | 文件 | 角色 | 读它解决什么问题 |
|---|---|---|---|
| 0 | **本文件 README.md** | 项目入口 | 这是什么、做到哪了、怎么跑起来 |
| 1 | [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md) | **事实基座（每次开工必读）** | 技术栈锁定、视觉铁律、环境变量总表、常见变更操作手册、已知坑速查 |
| 2 | [docs/现状说明书.md](file:///D:/ZHANGLEI/laity-archive/docs/%E7%8E%B0%E7%8A%B6%E8%AF%B4%E6%98%8E%E4%B9%A6.md) | **现行事实** | 系统是什么、数据与口径、页面与路由、工程与运维；除 AGENTS 外只看这一份 |
| 3 | [docs/05-重构方案/重构方案V3-总览.md](file:///D:/ZHANGLEI/laity-archive/docs/05-%E9%87%8D%E6%9E%84%E6%96%B9%E6%A1%88/%E9%87%8D%E6%9E%84%E6%96%B9%E6%A1%88V3-%E6%80%BB%E8%A7%88.md) | 方向与批次 | 为什么这样改、B0–B5 进度、裁定的取舍（含附录 A/B/C） |
| 4 | [docs/archive/2026-11-16-旧编号体系/](file:///D:/ZHANGLEI/laity-archive/docs/archive/2026-11-16-%E6%97%A7%E7%BC%96%E5%8F%B7%E4%BD%93%E7%B3%BB/) | 封存的历史文档 | 旧 SPEC / DESIGN / ISSUES，仅用于查历史决策过程，不作实现依据 |

冲突判定顺序：**代码与运行时实测 > AGENTS.md > docs/现状说明书.md > 重构方案 V3 > 封存文档**；README 只作入口，发现冲突一律回报。

## 项目结构

```
laity-archive/
├── AGENTS.md              # 事实基座
├── README.md              # 项目入口
├── .github/workflows/     # ci.yml (门禁) + deploy.yml (自动部署)
├── deploy/                # nginx 配置与证书挂载位
├── docs/                  # 现状说明书、重构方案、产品评审、研发日志、测试记录、软著材料、归档
├── prisma/                # schema.prisma、migrations/、seed.ts
├── src/
│   ├── app/               # 页面路由 (App Router) + api
│   ├── components/        # 核心组件（导航、时间轴、编辑器、分享等）
│   └── lib/               # 数据访问层与纯函数（哈希、鉴权、系列、快照、内链）
├── tests/                 # node --test 用例
└── tools/                 # 软著材料生成器
```

## 常见任务

- **改数据模型**：只改 `prisma/schema.prisma` → `npx prisma migrate dev --name <意图>` → 同步查询层。
- **发布日志**：后台写 BEFORE / AFTER → 点击「保存并发布」，系统按 D5 口径盖 SHA-256 印章；发布时会保存一份“上次发布快照”，编辑页可回看与对比。
- **系列与内链**：编辑页填“系列”（可空，带已有系列联想）；正文写 `[[slug]]` 即生成内链，目标页显示“被引用”；系列页为 `/u/<handle>/series`。
- **公开预览**：编辑页点“生成 24 小时预览链接”，把 `/preview/<token>` 发给未登录读者；可随时“撤销全部”。
- **GitHub 同步与 AI**：后台点击 `[ 从 GitHub 同步 ]` 拉取提交；在编辑页点 `[ AI 帮我写 ]` 调用通义千问自动生成复盘。
- **重出软著材料**：`node tools/软著材料生成.mjs`（窗口容量按整页折算，不要绕过 `assertWindowFit()`）。
- **生产部署**：本地 `git push origin main` 即可，GitHub Actions 会自动接管后续流程（需在仓库 Secrets 配置好服务器 SSH 凭据）。

## 工作方式

所有开发遵循五层防线：**事实基座 → 规格锁定 → 阶段闭环 → 验收门禁 → 过程存证**。
一次只做一个 Phase，验收通过才进下一个；范围外问题记入 `docs/06-产品评审/` 或 `docs/现状说明书.md` 的变更记录，先不动手；没执行的测试一律标"未验证"。
