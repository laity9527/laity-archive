# GitHub Actions 自动部署方案大纲

作者：张磊
日期：2026-11-11
状态：**待批准（只出方案，未写任何 YAML）**
上游：AGENTS.md 通用红线、`.github/workflows/ci.yml`、`docker-compose.prod.yml`、`Dockerfile`

> 目标：本地代码 push 到 `main` → 门禁通过 → GitHub Actions 自动 SSH 到阿里云服务器 → 拉代码 → 重建 Docker 镜像 → 跑 Prisma 迁移 → 重启服务 → 健康校验。
> 本文是大纲，批准后才动手写 `.github/workflows/deploy.yml`。凡涉及 CI 配置改动，按 AGENTS 红线逐条报批。

---

## 零、现状盘点（方案的地基，全部来自实读）

- **门禁工作流** `.github/workflows/ci.yml`：name 为「发版门禁」，触发 `push: main` / `pull_request` / `workflow_dispatch`；单 job `gates` 跑 `npm ci → prisma generate → next typegen → lint → tsc → test → migrate deploy → build → 材料自检`，自带一次性 postgres:16 服务。**它只管质量，不管部署。**
- **生产编排** `docker-compose.prod.yml`（项目名 `laity-prod`）五个服务：
  - `preflight`：一次性门禁容器，硬卡 DB 非 root/口令≥12、https 域名、NEXTAUTH_SECRET≥32、GITHUB 两键、ENCRYPTION_KEY 64-hex、OSS 四键、AI_API_KEY 非空；不过则整栈拒绝起。
  - `db`：postgres:16，数据卷 `laity_prod_data`，不对宿主机开口，带 healthcheck。
  - `app`：build target `runner`，镜像 `laity-archive:prod`，依赖 db healthy，只绑 `127.0.0.1:3000`，healthcheck 打 `/api/health` 且要求 `db=true`。
  - `migrate`：build target `migrator`，镜像 `laity-archive-migrate:prod`，`profiles: ["tools"]`（`up -d` 不会起它，须 `run --rm migrate` 显式跑），env 只有 DATABASE_URL。
  - `web`：nginx:1.27-alpine，依赖 app healthy，80/443，挂 `deploy/nginx.conf` 与 `deploy/certs`。
- **镜像** `Dockerfile`：多阶段 `deps → builder → runner`，另出 `migrator`；`ARG BASE_IMAGE=node:24-slim`、`ARG NPM_REGISTRY`（可指镜像源）——**这两个 build-arg 是网络抗性的现成抓手**。
- **现行手动部署三步**（compose 头部）：`build` → `run --rm migrate` → `up -d`。自动部署就是把这三步搬进 SSH 会话并加上护栏。
- **已知网络事实**：本会话多次实测服务器/本机 → GitHub 443 超时或连接重置（I019 镜像经镜像站、push 反复断连）。**网络抗性不是可选项，是必选项。**

## 一、工作流设计：新建 deploy.yml，ci.yml 一字不动

**结论：新建 `.github/workflows/deploy.yml`，用 `workflow_run` 挂在「发版门禁」成功之后；不扩展 ci.yml。**

理由：
1. **职责分离**——ci.yml 是"质量门"（每次 push + 每个 PR 都跑），deploy.yml 是"生产发布"（只在 main、只在门禁通过后）。PR 绝不能触发部署，分开最干净。
2. **红线友好**——AGENTS 规定改 CI 配置需逐条批准。新建文件比改 ci.yml 的影响面小，ci.yml 完全不动。
3. **触发隔离**——deploy 只认 `push` 到 `main` 且门禁 `success`，PR 与手动 dispatch 都不部署。

关键步骤（deploy job）：
1. `workflow_run` 触发，`if` 三重守卫：`conclusion == 'success'` && `head_branch == 'main'` && `event == 'push'`。
2. **checkout 必须钉到 `github.event.workflow_run.head_sha`**——不是 main 的当前 HEAD（门禁跑完后 main 可能又前进了），否则会部署一个没过门禁的提交。这是 workflow_run 模式最容易踩的正确性坑。
3. `concurrency: { group: deploy-production, cancel-in-progress: false }`——同一时刻只允许一个部署，且不取消在途的（避免半个部署被掐断）。
4. 挂 GitHub **Environment `production`**（可设 required reviewers 做人工放行 + 只允许 main 分支），secrets 按环境隔离。
5. 装 SSH 私钥 → `ssh-keyscan` 钉住服务器 host key → SSH 执行部署脚本（见第三节顺序）。
6. 部署脚本末尾健康校验，失败则非零退出 + 告警。

**备选方案（若你更想要原子性）**：在 ci.yml 末尾加一个 `deploy` job，`needs: gates`、`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`。优点是无 workflow_run 的 head_sha  subtlety、门禁与部署同一次运行；代价是要改 ci.yml（红线，需批准）。**我推荐主方案（新建 + workflow_run），备选听你裁定。**

**构建在哪做**：按你给的目标流程，**在服务器上构建**（SSH → git pull → `docker compose build`），与现行手动流程一致。代价是服务器要拉基础镜像与 npm 依赖（网络风险在服务器侧，见第四节）。更稳的长期形态是"CI 构建镜像 → 推阿里云 ACR → 服务器只拉一个镜像"，把服务器→GitHub 的依赖整段消掉——列为可选演进，不在首版。

## 二、凭据安全：只存 Secrets，真实值永不落仓库

GitHub Secrets（建议放 `production` Environment 下）：

| Secret 名 | 内容 | 备注 |
|---|---|---|
| `DEPLOY_HOST` | 服务器 IP 或域名 | 非密钥，但仍走 Secret 统一管理 |
| `DEPLOY_USER` | SSH 登录用户 | 建议专用 `deploy` 用户（在 docker 组），不给 root |
| `DEPLOY_SSH_KEY` | SSH **私钥**全文 | 推荐 ed25519；公钥放服务器 authorized_keys |
| `DEPLOY_PORT` | SSH 端口（可选） | 默认 22 |
| `DEPLOY_PATH` | 服务器上仓库路径（可选） | 如 `/opt/laity-archive` |

铁律（对齐 AGENTS「凭据留痕与验证口径」）：
- **私钥只进 GitHub Secret，绝不进仓库、不进日志、不进对话。** 方案与 YAML 里只出现 Secret 名。
- 专用部署密钥：`ssh-keygen -t ed25519 -C "laity-deploy"` 生成一对，公钥上服务器、私钥进 Secret；可在 authorized_keys 里用 `from="<GitHub Actions 出口段>",command="..."` 进一步收窄（可选）。
- **host key 必须校验**：`ssh-keyscan` 取服务器公钥指纹写进 known_hosts，`StrictHostKeyChecking=yes`。**禁止 `StrictHostKeyChecking=no`**（那是把 MITM 大门敞开）。
- 服务器上的 `.env.production`（DB 口令、GITHUB_SECRET、ENCRYPTION_KEY、AI_API_KEY、OSS 四键）**留在服务器，不进 GitHub**。部署工作流不需要这些值——compose 用 `--env-file .env.production` 在服务器本地读。
- 日志脱敏：`ssh -o BatchMode=yes`，不回显私钥；GitHub 会自动 mask Secret，但脚本里也不主动 echo。
- 最小权限：deploy 用户只需 docker + git + 应用目录读写，不需要完整 root。

## 三、迁移与回滚策略：先迁移后切换，备份兜底，失败不伤旧服务

核心原则：**旧 app 一直 serving，直到"迁移成功 + 新镜像健康"两关都过才切换。** 任何一关失败，旧服务不动、告警、留现场。

部署脚本顺序（SSH 会话内）：
1. **拉代码**：`git fetch`（带重试，见第四节）→ `git reset --hard <head_sha>`。
2. **备份数据库**（迁移前的回滚锚点）：`docker compose exec -T db pg_dump -U <user> <db> > /opt/laity-backups/laity-<sha>-<时间戳>.sql`。备份失败则**中止部署**（没有兜底就不许动库）。
3. **构建新镜像并打 SHA 标签**：`docker compose build`，同时把上一版镜像保留为 `laity-archive:prod-prev`（回滚用）。
4. **先跑迁移**：`timeout 120 docker compose run --rm migrate`（即 `prisma migrate deploy`）。
   - 成功（exit 0）→ 进第 5 步。
   - 失败/超时 → **不切换 app**，旧镜像继续跑；告警并打出失败迁移名 + 备份文件路径，交负责人裁定。
5. **切换并健康校验**：`docker compose up -d`（preflight 自动先跑，env 不合格整栈拒起）→ 轮询 `curl /api/health` 要求 `db=true`，带超时（如 60s）。
   - 健康 → 部署成功，清理多余备份（保留最近 N 份）。
   - 不健康 → **自动回滚 app 镜像到 `prod-prev` 并 `up -d`**，告警。

关于 Prisma 迁移的硬事实与降级预案：
- `migrate deploy` 是**前向、幂等**的：按序应用未应用的迁移，失败即停并在 `_prisma_migrations` 标记失败。**Prisma 没有自动 down-migration。**
- 因此**数据库回滚不自动做**——自动 restore 一份 pg_dump 有数据丢失风险（会抹掉迁移间隙的新写入）。预案是：迁移失败 →  halt + 旧 app 不动 + 把备份路径和失败迁移名告警出来，**由负责人决定是否手动 restore**。这条与 AGENTS「数据库变更只走迁移、不直接对库执行」一致：自动流程只跑 migrate deploy，restore 是人工决策。
- **挂起怎么办**：migrate 步套 `timeout 120`，deploy job 设 `timeout-minutes`（如 20）。超时即杀、旧服务不动、告警。绝不无限等。
- **并发**：concurrency group 保证不会两个部署同时动库。
- **幂等可重跑**：失败后重新触发是安全的——git reset 到同一 SHA、migrate deploy 幂等、compose up -d 收敛。

## 四、网络抗性：重试 + 超时 + 镜像源，失败要响不要哑

针对"服务器连 GitHub 经常 443 超时"：

1. **git 拉取重试**：`git fetch` 套 3 次重试 + 指数退避；并设 `git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30`，让"卡住的连接"30 秒内快速失败而不是干等。浅拉 `--depth 1` 减少传输量。
2. **基础镜像拉取**（node:24-slim / postgres:16 / nginx:1.27-alpine 来自 Docker Hub，服务器侧同样可能超时）：
   - 用 Dockerfile 现成的 `BASE_IMAGE` build-arg 指阿里云镜像（如 `registry.cn-hangzhou.aliyuncs.com/...`）；
   - 或在服务器上预先经阿里云加速器拉好并 `docker tag` 成官方名（本会话 I007/I019 本机就是这么做的）；
   - 或给 Docker daemon 配 `registry-mirrors`（阿里云加速器）。
3. **npm 依赖**：build 时传 `NPM_REGISTRY=https://registry.npmmirror.com`（Dockerfile 已支持），不走官方源。
4. **报错机制**：每个网络敏感步都有"重试 + 超时"，重试耗尽即**非零退出、大声失败**——旧 app 仍在跑、GitHub Actions 标红、可选 webhook/邮件告警。**绝不静默成功。**
5. **长期最优解（可选演进）**：把构建挪到 CI（GitHub runner 连 GitHub 顺畅），镜像推阿里云 ACR（境内拉取快），服务器只 `docker pull` 一个镜像——**整段消掉服务器→GitHub 的依赖**。首版先按"服务器构建 + 镜像源 + 重试"落地，这条留作二期。

## 五、分阶段落地与判据（每阶段 separately 报批）

- **Phase 0（负责人手动，AGENTS 红线：服务器动作只能本人执行）**：建 deploy 用户与 SSH 密钥、防火墙（只开 80/443 + 受限 SSH）、填 `.env.production`、放证书、克隆仓库到 `/opt/laity-archive`、装 Docker/compose、经镜像源预拉基础镜像。
  **判据**：手动 `docker compose --env-file .env.production -f docker-compose.prod.yml build && run --rm migrate && up -d` 成功一次，`/api/health` 返回 `db=true`。
- **Phase 1**：新建 deploy.yml（workflow_run）+ 配 Secrets + production Environment。
  **判据**：一次 push main 触发"门禁→部署"，服务器健康绿。
- **Phase 2**：加 pg_dump 备份 + 镜像 SHA 标签回滚 + 健康门。
  **判据**：人为造一个坏迁移/坏镜像，验证旧 app 不动 + 告警 + 可回滚。
- **Phase 3（可选）**：构建挪 CI + 推 ACR。

## 六、红线与待批准清单

1. **CI 配置改动需批准**（AGENTS）：新建 deploy.yml（主方案）或改 ci.yml（备选）——批准后才写 YAML。
2. **服务器provisioning 只能负责人执行**：本方案只给带判据的步骤清单，不代执行。
3. **真实凭据永不落仓库**：方案与 YAML 只出现 Secret 名。
4. **不改 lockfile / build 配置**：部署复用现有 Dockerfile 与 compose，不新增应用依赖。
5. **数据库只走 migrate deploy**：自动流程不直接对库执行 SQL，restore 是人工决策。

**等你裁定**：① 主方案（新建 deploy.yml + workflow_run）还是备选（ci.yml 加 deploy job）？② 首版是否就要 Phase 2 的备份+回滚，还是先 Phase 1 跑通再补？③ 构建在服务器（首版）还是直接上 CI+ACR（二期形态）？批准后我按 Phase 写 YAML。