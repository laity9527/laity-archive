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
| 2 | PostgreSQL 容器 Up | `docker ps` | laity-postgres Up | `laity-postgres   postgres:16   "docker-entrypoint.s…"   Up   0.0.0.0:5432->5432/tcp`；`wsl --status` 现为"默认版本: 2"；容器日志 `database system is ready to accept connections`，`pg_isready` 输出 `accepting connections` | PASS |
| 3 | 迁移成功 | `npx prisma migrate dev` | 生成迁移文件无报错 | `Applying migration 20261030070530_init` → `Your database is now in sync with your schema.`；生成 `prisma/migrations/20261030070530_init/migration.sql` 与 `migration_lock.toml`；库内 `\dt` 可见 `Log`、`Project`、`_prisma_migrations` | PASS |
| 4 | 种子数据入库 | `npx prisma db seed` + 查库 | 1 Project、1 条已发布 Log | `seed 完成：1 个 Project，1 条已发布 Log`；`psql` 查得 Project（earth-mirror/地球 Mirror/product/WIP）1 行，Log（prebuild-index，isPublished=t，contentHash=a0197426…a2f5，publishedAt=2026-03-12 08:00:00）1 行 | PASS |
| 5 | /logs 显示种子标题，改库即时变化 | 访问 /logs 并改库标题 | 显示"决定放弃本地搜索，改用索引预构建" | `/logs` HTTP 200 且含标题；改库为"…（改库验证）"后页面含新标题 2 处、旧标题 0 处；还原后旧标题回来，证明非 Mock 非缓存 | PASS |
| 6 | 生产构建通过 | `npm run build` | 退出码 0 | `✓ Compiled successfully in 1966ms`；路由表：`/`(Static)、`/_not-found`、`/logs`(Partial Prerender) | PASS |
| 7 | Lint 零 error | `npm run lint` | 无输出/零 error | 无任何报错输出 | PASS |
| 8 | Prisma Client 生成 | `npx prisma generate` | 成功 | 首次紧接迁移时报 `EPERM: operation not permitted, rename …query_engine-windows.dll.node`；根因是此前探针遗留的 4 个 `next start`（3123–3126）仍占用该 DLL，结束这些进程后重跑输出 `✔ Generated Prisma Client (v6.19.3) … in 109ms` | PASS（修复后） |

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

## 五、附录：离线迁移 SQL 预览

库起不来，但 schema 到 SQL 的翻译不需要库。`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` 的真实输出（节选关键句）：

```sql
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    ...
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tags" TEXT[],
    "beforeDate" TIMESTAMP(3) NOT NULL,
    "afterDate" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    ...
    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "Log_slug_key" ON "Log"("slug");
CREATE INDEX "Log_isPublished_beforeDate_idx" ON "Log"("isPublished", "beforeDate");
CREATE INDEX "Log_projectId_idx" ON "Log"("projectId");
ALTER TABLE "Log" ADD CONSTRAINT "Log_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

读出来的两点事实（供 WSL2 就绪后对照）：`tags` 是 `TEXT[]` 且 NOT NULL 无默认值，任何插入都必须给 `tags`；时间列是 `TIMESTAMP(3)`（无时区），Prisma 按 UTC 写入，展示层再做时区与 UTC 标注。

## 六、解除阻塞实录（2026-10-30）

WSL2 装好后一路走下来的顺序与真实输出：

1. `wsl --status` → `默认分发: Ubuntu / 默认版本: 2`（此前是"未安装适用于 Linux 的 Windows 子系统"）。
2. `docker ps` 仍报 `Docker Desktop is unable to start`——根因不是 WSL2 缺失，而是 Docker 后端进程自 WSL2 装好之前就在运行，日志里 `still waiting for the engine to respond to _ping after 1h51m`。`docker desktop stop` → `docker desktop start` 后 `docker ps` 正常输出表头。
3. `docker compose up -d` 首次失败：`dial tcp 108.160.169.174:443: connectex: …` —— Docker Hub 直连超时（本机无代理，`registry-1.docker.io` 探测返回 000）。经你确认后改用镜像站：`docker pull docker.m.daocloud.io/library/postgres:16`（digest `sha256:1beaa3084eee2676f20a9cd9928f0bf2c5bf674f8e49f81017912183d377c61c`），再 `docker tag` 成 `postgres:16`，未改任何 Docker 配置文件。compose 用本地镜像创建卷/网络/容器成功。
4. `npx prisma migrate dev --name init` 生成并应用 `20261030070530_init`；随后的 `prisma generate` 报 EPERM，结束遗留的 4 个 `next start` 进程后成功。
5. `npx prisma db seed` 成功；`psql` 复核表结构与数据见第四、五条。

## 七、结论

- 判定：**PASS（截图项除外）**——8 条验收中 7 条实测通过（含第 8 条修复后通过）；docs/03 带地址栏截图仍待我本人在浏览器里截，未用任何替代物冒充。
- 阻塞解除：WSL2 已装（默认版本 2），容器 Up，迁移与种子均落库，`/logs` 显示真数据且随库变化。
- 范围外发现：I004 已解除（WSL2）；新增 I007（postgres 镜像经 daocloud 镜像站拉取，官方源不可达）、I008（Prisma 生成被遗留 next start 进程锁住 DLL）。
- 下一步：补截图 → 独立验收 → 提交（`prisma/migrations/` 随本次提交入库）。