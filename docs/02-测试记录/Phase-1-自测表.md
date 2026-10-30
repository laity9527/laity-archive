# Phase 1 自测表：环境就绪 + 一条真数据的最小闭环

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 1 验收标准
说明：粘贴真实执行输出；未执行项如实标注原因与后续动作。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | Node ≥ v22 | `node -v` | ≥ v22 | `v24.13.0` | PASS |
| 2 | PostgreSQL 容器 Up | `docker ps` | laity-postgres Up | `Error response from daemon: Docker Desktop is unable to start`；根因：`wsl --status` 输出"未安装适用于 Linux 的 Windows 子系统" | 未验证（环境阻塞） |
| 3 | 迁移成功 | `npx prisma migrate dev` | 生成迁移文件无报错 | 未执行：数据库引擎无法启动 | 未验证 |
| 4 | 种子数据入库 | `npx prisma db seed` + studio 查验 | 1 Project、1 条已发布 Log | 未执行：数据库引擎无法启动 | 未验证 |
| 5 | /logs 显示种子标题，改库即时变化 | 浏览器访问 http://localhost:3000/logs | 显示"决定放弃本地搜索，改用索引预构建" | 页面返回 HTTP 200（静态壳）；流式部分报 Prisma 连接错误（数据库未起），日志证据已随本次交付记录 | 未验证 |
| 6 | 生产构建通过 | `npm run build` | 退出码 0 | `✓ Compiled successfully in 1966ms`；路由表：`/`(Static)、`/_not-found`、`/logs`(Partial Prerender) | PASS |
| 7 | Lint 零 error | `npm run lint` | 无输出/零 error | 无任何报错输出 | PASS |
| 8 | Prisma Client 生成 | `npx prisma generate` | 成功 | "Start by importing your Prisma Client" | PASS |

补充验证：首页实际渲染已核对——`curl http://localhost:3000/` 返回内容含 `<title>Laity 项目档案库</title>`、"不囤想法，直接上线。"、"PHASE 1 · 数据来自本机 PostgreSQL"，HTTP 200。

## 二、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 越界文件 | 对照 DESIGN.md Phase 1 清单 | 多出 1 个文件 src/lib/logs.ts——为满足 AGENTS.md"前台只能走 getSafeLogs 封装"红线而建，已在研发日志说明；其余均在清单内 |
| 新增依赖 | package.json diff | next/react/react-dom/tailwind/eslint/TS（脚手架基础）；@prisma/client + prisma@6.19.3（AGENTS.md 锁定栈）；无计划外依赖 |
| 配置/lockfile | — | 未改 build/CI 配置；package-lock.json 为脚手架首次生成，属预期 |
| 密钥入库 | `git status` | `.env` 被 .gitignore 忽略，未入库；`.env.example` 仅含本地开发约定值 |

## 三、视觉铁律核查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 圆角/阴影/渐变 | `grep -rnE "rounded-(?!none)\|shadow-(?!none)\|bg-gradient" src/` | 零命中 |
| 图标库 | grep 图标库 import | 零命中 |

## 四、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts/.tsx 均有文件头注释 | PASS（db.ts / logs.ts / seed.ts / layout.tsx / page.tsx / logs/page.tsx） |
| 修改的旧文件追加修改记录行 | layout.tsx 等均为当日新建，无历史覆盖 |
| docs/01 有本 Phase 研发日志 | 已追加 |
| docs/03 带地址栏截图 | 待补：需人工在浏览器打开 localhost:3000 截图（数据库起后截 /logs） |
| 独立 commit | 未提交：本轮未获提交授权，等你确认后再提交 |

## 五、结论

- 判定：**条件性 PASS**——代码侧（构建/lint/视觉/结构）全部通过；数据库侧 4 项因 WSL2 未安装而阻塞，未验证。
- 解除阻塞动作（需我本人执行）：`wsl --install`（管理员权限 + 重启）→ 启动 Docker Desktop → `docker compose up -d` → `npx prisma migrate dev` → `npx prisma db seed` → 浏览器验收第 5 条并截图。
- 范围外发现：I004（WSL2 未安装阻塞 Docker）。
- 下一步：环境阻塞解除后回填本表第 2/3/4/5 条，再进入独立验收与提交。