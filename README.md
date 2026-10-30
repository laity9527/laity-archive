# Laity 项目档案库

不囤想法，直接上线。用 AI 与代码把想法直接变成上线产品，记录每一次判断与踩坑。

个人全栈数字档案库：厂牌官网（展示成果）+ 开发复盘（软著证据链）。

## 技术栈

Next.js（App Router）· TypeScript · Tailwind CSS · Prisma · PostgreSQL 16 · NextAuth（GitHub OAuth）

## 快速开始（本地环境就绪后）

```bash
npm install
docker compose up -d          # 启动 PostgreSQL
npx prisma migrate dev        # 建表
npx prisma db seed            # 种子数据
npm run dev                   # http://localhost:3000
```

环境变量参考 `.env.example`（Phase 1 创建）。

## 文档索引

| 文件 | 用途 |
|---|---|
| AGENTS.md | 事实基座：技术栈锁定、视觉铁律、红线（AI 必读） |
| SPEC.md | 需求规格：功能清单 / 数据模型 / 接口契约 / 非目标 |
| DESIGN.md | 架构决策记录 + 6 个 Phase 路线图 + 验收标准 |
| ISSUES.md | 范围外问题台账 |
| docs/00-开发方法论/ | 五层防线工作法、环境搭建指南 |
| docs/01-研发日志/ | 每日指令原文、思考、踩坑 |
| docs/02-测试记录/ | 各 Phase 自测表 |
| docs/03-功能截图/ | 带地址栏的运行截图 |
| docs/04-软著材料/ | 源代码文档、说明书 |

## 工作方式

所有开发遵循五层防线：事实基座 → 规格锁定 → 阶段闭环 → 验收门禁 → 过程存证。
一次只做一个 Phase，验收通过才进下一个。详见 docs/00-开发方法论/。