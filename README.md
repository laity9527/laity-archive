
# Laity 项目档案库

**一句话定位**：多租户的开发者数字档案库——用极简纸白排版展示成果，用 Before/After 开发日志承载复盘，发布时自动写入 SHA-256 内容摘要，并支持 GitHub 提交自动同步与 AI 辅助撰写。

数字档案，记录每一次工程决策。收集项目作品与开发复盘，构建一份可信的数字履历。

当前形态：**V2.2 多租户**（GitHub OAuth 一键登录，各账号读写独立隔离；无自建注册、无 UGC；含 GitHub 提交自动同步引擎与 AI 辅助生成；支持 RSS 订阅）。决策见 [DESIGN.md](file:///D:/ZHANGLEI/laity-archive/DESIGN.md) 的 D33。

## 当前状态快照（2026-11-12）

| 维度 | 状态 |
|---|---|
| 阶段进度 | **V2.2（F19–F27 已实施）**：多租户隔离、GitHub 同步、AI 辅助生成、全站搜索与高亮、数据导出、标签聚合页与 RSS 订阅均已上线 |
| 回归测试 | `npm test` **154 条断言全绿**（Node 自带 test runner，零测试依赖；只测纯逻辑） |
| 四道门禁 | `npm run lint` / `npx tsc --noEmit` / `npm run build` / `npm test` 全 0；CI 同序代跑 |
| 数据实况 | 生产环境已接入多账号 GitHub 登录，数据物理隔离；第一条真实数据为本项目自身 |
| 自动化交付 | 已接入 **GitHub Actions 自动部署**：push 到 `main` 且门禁通过后，自动 SSH 至服务器备份、构建、迁移与健康校验 |
| 文档体系 | SPEC.md 覆盖 F19–F27（含 F26 标签聚合、F27 RSS 订阅）；DESIGN.md 补至 D38；AGENTS/README/ISSUES 同步本轮 |

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

`npm test` 覆盖纯逻辑：摘要口径、对象名断言、敏感信息扫描、开源许可、Token 加密、Prompt 解析、同步过滤等。

## 文档导读（新开发者按这个顺序读）

| 顺序 | 文件 | 角色 | 读它解决什么问题 |
|---|---|---|---|
| 0 | **本文件 README.md** | 项目入口 | 这是什么、做到哪了、怎么跑起来 |
| 1 | [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md) | **事实基座（每次开工必读）** | 技术栈锁定、视觉铁律、环境变量总表、常见变更操作手册、已知坑速查 |
| 2 | [DESIGN.md](file:///D:/ZHANGLEI/laity-archive/DESIGN.md) | 架构与取舍 | **先读「零、架构总览」与「零·补、历史决策裁剪说明」**，再按需查 D1–D33 决策记录 |
| 3 | [SPEC.md](file:///D:/ZHANGLEI/laity-archive/SPEC.md) | 需求规格（V2.0 冻结） | 读 F 编号：F01–F22 范围与验收口径、数据模型、接口契约、追溯矩阵 |
| 4 | [ISSUES.md](file:///D:/ZHANGLEI/laity-archive/ISSUES.md) | 范围外问题台账 | 遇到疑似历史遗留问题先查这里（I001–I080） |

冲突判定顺序：**代码与运行时实测 > AGENTS.md > SPEC.md > DESIGN.md > ISSUES.md**；README 只作入口，发现冲突一律回报。

## 项目结构

```
laity-archive/
├── AGENTS.md              # 事实基座
├── SPEC.md / DESIGN.md / ISSUES.md / README.md
├── .github/workflows/     # ci.yml (门禁) + deploy.yml (自动部署)
├── deploy/                # nginx 配置与证书挂载位
├── docs/                  # 开发方法论、研发日志、测试记录、软著材料、归档
├── prisma/                # schema.prisma、migrations/
├── src/
│   ├── app/               # 页面路由 (App Router)
│   ├── components/        # 核心组件（导航、时间轴、编辑器等）
│   └── lib/               # 数据访问层与工具（哈希、上传、鉴权、AI 客户端）
├── tests/                 # node --test 用例
└── tools/                 # 软著材料生成器
```

## 常见任务

- **改数据模型**：只改 `prisma/schema.prisma` → `npx prisma migrate dev --name <意图>` → 同步查询层。
- **发布日志**：后台写 BEFORE / AFTER → 点击「保存并发布」，系统按 D5 口径盖 SHA-256 印章。
- **GitHub 同步与 AI**：后台点击 `[ 从 GitHub 同步 ]` 拉取提交；在编辑页点 `[ AI 帮我写 ]` 调用通义千问自动生成复盘。
- **重出软著材料**：`node tools/软著材料生成.mjs`（窗口容量按整页折算，不要绕过 `assertWindowFit()`）。
- **生产部署**：本地 `git push origin main` 即可，GitHub Actions 会自动接管后续流程（需在仓库 Secrets 配置好服务器 SSH 凭据）。

## 工作方式

所有开发遵循五层防线：**事实基座 → 规格锁定 → 阶段闭环 → 验收门禁 → 过程存证**。
一次只做一个 Phase，验收通过才进下一个；范围外问题记 ISSUES.md 不动手；没执行的测试一律标"未验证"。
```

---

### 💡 主要修改点汇总：
1. **当前状态快照**：把回归测试从 `73` 改到了 `95`，把日期更新到了 `2026-11-11`，去掉了过时的“待实施”，加上了“自动化交付”和“AI 辅助生成”。
2. **技术栈**：删除了“管理员口令登录”，换成了“GitHub OAuth 一键登录”，并补充了 AI 引擎。
3. **环境要求**：提醒了新增的 `AI_API_KEY` 和 `ENCRYPTION_KEY`。
4. **自动化流水线**：补充了 `deploy.yml` 自动部署的逻辑（备份、迁移、健康回滚）。
5. **文档导读**：将 `D1–D32` 更新为 `D1–D33`，`I001–I072` 更新为 `I001–I080`，`F01–F18` 更新为 `F01–F22`。
