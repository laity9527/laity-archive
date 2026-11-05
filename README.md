# Laity 项目档案库

**一句话定位**：单人可一键部署的开发者数字档案库——厂牌官网展示成果，Before/After 开发日志承载复盘，发布时自动写入 SHA-256 内容摘要与服务器时间作技术存证。

不囤想法，直接上线。用 AI 与代码把想法直接变成上线产品，记录每一次判断与踩坑。

当前形态：**V1.0 单人版**（无注册、无多用户、无 UGC；后台 `/admin` 仅一把 `ADMIN_PASSWORD` 口令登录）。
V2.0 多用户 SaaS 已归档搁置，不在任何对外承诺里——见 [DESIGN.md](file:///D:/ZHANGLEI/laity-archive/DESIGN.md) 的「历史决策裁剪说明」。

## 当前状态快照（2026-11-05）

| 维度 | 状态 |
|---|---|
| 阶段进度 | **Phase 1–7 已全部闭环并独立验收**（Phase 8 法律文本、Phase 9 多用户为待裁决备选，前提不成立前不开工） |
| 回归测试 | `npm test` **73 条断言全绿**（Node 自带 test runner，零测试依赖；只测纯逻辑） |
| 四道门禁 | `npm run lint` / `npx tsc --noEmit` / `npm run build` / `npm test` 全 0；CI 同序代跑并含软著材料两步自检 |
| 数据实况 | 库里第一条真实数据是本项目自己（`laity-archive` 项目 + 一条已发布日志），非种子示例 |
| 在途待实施 | 两项：**D30** 视觉令牌切换（`#FBFBF9` → `#f4f1ec` 语义化体系，实施前现行实测值仍有效）；**D31/F19** 新增 `/about` 关于页（导航由两项扩为三项） |
| 未验证项 | 生产编排整套实跑、软著材料真实分页、OSS 真实上传成功分支、镜像来源逐层比对、字体上游 LICENSE、依赖已知 CVE 等——逐条见 [DESIGN.md](file:///D:/ZHANGLEI/laity-archive/DESIGN.md)「六、未验证项清单」，一律标"未验证"，不用推断补全 |
| 文档体系 | SPEC.md 已转 V1.0 冻结口径（F01–F18），DESIGN.md 补裁剪说明与执行档案定位（D32）；AGENTS/README/ISSUES 同步于本轮 |

## 技术栈

Next.js 16.4.3（App Router + RSC + PPR）· TypeScript 5.9.3 · Tailwind CSS 4.3.3 · Prisma 6.19.3 · PostgreSQL 16（Docker）· next-auth 4.24.15（管理员口令登录，仅 `/admin`）· 阿里云 OSS（图片外链）

版本均为**实测值且属锁定项**，不建议升级、不可替换；写 Next.js 代码前必须先读 `node_modules/next/dist/docs/` 对应指南（版本红线，优先级最高）。

## 环境要求

- Node.js ≥ v22（本机实测 Node v24.13.0 + npm 11.6.2）
- Docker Desktop + 本地 PostgreSQL 16 容器（库名 `laity`）
- 端口：应用 3000、数据库 5432
- 包管理固定 npm（禁 pnpm / yarn / bun）
- 真实 `.env` / `.env.production` 由负责人本人填写与维护；模板见 `.env.example` 与 `.env.production.example`

## 快速开始

```bash
npm ci                        # 用锁文件原样安装（与发版门禁同一口径，不用 npm install）
docker compose up -d          # 启动本地 PostgreSQL 16
npx prisma migrate dev        # 建表（迁移只由 prisma migrate 生成，不手改、不直接对库执行 SQL）
npx prisma db seed            # 本地种子数据（生产不播种，数据一律由后台录入）
npm run dev                   # http://localhost:3000
```

后台入口 `http://localhost:3000/admin`，未登录会跳自建登录页 `/login`，口令取 `.env` 里的 `ADMIN_PASSWORD`。

> Windows + Git Bash 三个已踩过的坑见 [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md)「已知坑速查」：
> MSYS 会改写容器内路径（命令前加 `MSYS_NO_PATHCONV=1`）、Node 眼里的 `/tmp` 不是 Git Bash 的那个
> （临时产物写仓库内 `tmp/`）、管道尾接 `| head` 会让退出码变 SIGPIPE 假红（要判成败就重定向到文件再读）。

## 发版门禁

```bash
npm run lint && npx tsc --noEmit && npm run build && npm test
```

四条全 0 才算可发版。`.github/workflows/ci.yml` 在每次 push 与 pull request 上按同样顺序代跑，
外加软著材料两步自检（新文件没登记进收录清单、或改了说明书却忘了重出 HTML，都会红）。

`npm test` 覆盖纯逻辑：摘要口径、图片内容签名、slug 与表单取值、错误码文案、时间展示、
路由归属、敏感信息形态、开源许可清单、口令判定与节流、对象名断言。
**数据库层、需登录的 Server Action、页面渲染都不在其内**，那部分靠 `docs/02-测试记录/` 的自测表与人工联调，
不能用测试全绿代替。

## 文档导读（新开发者按这个顺序读）

| 顺序 | 文件 | 角色 | 读它解决什么问题 |
|---|---|---|---|
| 0 | **本文件 README.md** | 项目入口 | 这是什么、做到哪了、怎么跑起来 |
| 1 | [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md) | **事实基座（每次开工必读，优先级最高的受控文档）** | 技术栈锁定与环境实况、视觉铁律精确值、合规与安全红线、通用红线、验证命令、软著材料铁律、常见变更操作手册（改一处要跟着改哪里）、环境变量总表、已知坑速查、术语表、开工与交付自检清单 |
| 2 | [DESIGN.md](file:///D:/ZHANGLEI/laity-archive/DESIGN.md) | 架构与取舍 | **先读「零、架构总览」与「零·补、历史决策裁剪说明」**（一页看懂分层、三条关键链路、唯一真相点，以及哪些旧口径已失效），再按需查 D1–D32 决策记录、Phase 执行档案、风险清单、技术债、未验证清单 |
| 3 | [SPEC.md](file:///D:/ZHANGLEI/laity-archive/SPEC.md) | 需求规格（V1.0 冻结） | 改某条功能前后读它的 F 编号：F01–F18 范围与验收口径、数据模型与状态机、接口契约与错误码、需求到实现的追溯矩阵、外部设计差异裁决 |
| 4 | [ISSUES.md](file:///D:/ZHANGLEI/laity-archive/ISSUES.md) | 范围外问题台账 | 遇到疑似历史遗留问题先查这里（I001–I072），看是否已知、是否已有处置 |

冲突判定顺序（AGENTS.md 的文档体系表为准）：**代码与运行时实测 > AGENTS.md > SPEC.md > DESIGN.md > ISSUES.md**；
README 只作入口，与那四份不一致时以那四份为准并回报冲突点。发现冲突一律回报，不私自抹平。

编号即坐标：`F##` 需求（SPEC）、`D##` 决策（DESIGN）、`I###` 问题（ISSUES）、`Phase #` 阶段（DESIGN）。
引用一律带编号，不写"那个某某功能"。

## 项目结构

```
laity-archive/
├── AGENTS.md              # 事实基座（AI 必读，改动需负责人点名授权）
├── SPEC.md / DESIGN.md / ISSUES.md / README.md
├── .github/workflows/     # 发版门禁的自动执行（改它需批准）
├── deploy/                # nginx 配置与证书挂载位
├── docs/
│   ├── 00-开发方法论/      # 五层防线工作法、环境搭建指南、上线与回滚手册、泄露应急预案、合规差距分析
│   ├── 01-研发日志/        # 每日：指令原文、思考、踩坑（现象→根因→修复）
│   ├── 02-测试记录/        # 各 Phase 自测表、待验证清单
│   ├── 03-功能截图/        # 真实运行截图（必须带地址栏）
│   ├── 04-软著材料/        # 源程序文档、操作说明书（md 是源，HTML 是产物）
│   └── archive/            # 已失效的历史草稿与外部方案，仅供决策背景参考，不作实现依据
├── prisma/                # schema.prisma、migrations/（只由 prisma migrate 生成）、seed.ts
├── src/
│   ├── app/               # 页面路由（App Router）+ api/health + privacy + licenses + not-found + error
│   ├── components/        # 核心组件（导航、页脚、时间轴、印章、看板、编辑器）
│   └── lib/               # 唯一数据访问层与工具（Prisma 实例、哈希、存证、上传、鉴权、站点标识）
├── tests/                 # node --test 用例，只测纯逻辑
├── tools/                 # 软著材料生成器（收录清单与窗口判据在这里）
└── docker-compose.yml     # 本地 PostgreSQL 容器（生产另用 docker-compose.prod.yml）
```

## 常见任务

改一处要跟着改哪里的对照表在 [AGENTS.md](file:///D:/ZHANGLEI/laity-archive/AGENTS.md)「常见变更操作手册」
（新增字段 / 页面 / Server Action / 环境变量 / 依赖各一节），踩过的坑在「已知坑速查」。几个高频的：

- **改数据模型**：只改 `prisma/schema.prisma` → `npx prisma migrate dev --name <意图>` → 同步查询层
  `select` 白名单与表单校验；不得直接对库执行 SQL。
- **发布一条日志**：后台 `/admin/logs/new`，双栏 Markdown 编辑器写 BEFORE / AFTER →
  「保存并发布」先写库再按**库里刚存的内容**算 SHA-256 并记服务器时间。
- **重出软著材料**：`node tools/软著材料生成.mjs`；改了任何收录文件后都要重出两份 HTML 并一并提交
  （窗口容量按整页折算，`assertWindowFit()` 会拒出件，不要绕过）。
- **生产部署**：见 `docs/00-开发方法论/上线与回滚手册.md`；外部系统动作（服务器、证书、口令轮换、推送）
  由负责人本人执行。

## 工作方式

所有开发遵循五层防线：**事实基座 → 规格锁定 → 阶段闭环 → 验收门禁 → 过程存证**
（详见 `docs/00-开发方法论/我的AI协作开发方法论-五层防线.md`）。
一次只做一个 Phase，验收通过才进下一个；范围外问题记 ISSUES.md 不动手；
粘贴实际执行的命令与真实输出，没执行的标"未验证"。
