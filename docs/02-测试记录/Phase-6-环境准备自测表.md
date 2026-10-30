# Phase 6 环境准备自测表：容器与编排产物

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 6 的第 1、2 条与第 3 条的"可在本地镜像内复现"部分
说明：本轮只做**环境准备**——构建产物、编排、反代配置、上线门禁，全部在我这台机器上真跑。服务器、域名、证书、生产 OAuth App 不在我手里，那部分逐条标未验证。表内输出均为实际粘贴。

---

## 一、交付物

| 文件 | 作用 |
|---|---|
| `Dockerfile` | 多阶段：deps → builder → runner，另出 migrator 目标；runner 只带 standalone 产物，非 root 运行 |
| `.dockerignore` | 构建上下文排除，重点是 `.env` 系列、`.git`、`docs`、`tmp` |
| `docker-compose.prod.yml` | preflight（上线门禁）+ db（不发布宿主机端口）+ app（只绑 127.0.0.1:3000）+ migrate（一次性）+ web（nginx） |
| `deploy/nginx.conf` | 80 全站跳 443、TLS 终结、安全响应头、反代 app:3000 |
| `.env.production.example` | 生产变量模板（真实值仍被 `.gitignore` 挡住，模板本身入库需在 .gitignore 加一条 `!`） |
| `next.config.ts` | 按 D6 加 `output: "standalone"`（只这一项） |
| `package-lock.json` | 按我批准的 A 方案重算（详见第三节） |

## 二、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|
| 1 | `docker build` 成功 | `docker build --target runner -t laity-archive:prod .` | 首次失败在 `npm ci`（见第三节）；换用重算后的 lockfile 后：`#19 naming to docker.io/library/laity-archive:prod done`、`build_exit=0`；补 openssl 后重建同样 0。镜像 `laity-archive:prod 551MB`（补 openssl 前 547MB） | PASS（本地） |
| 1b | 生产容器启动后 `curl -I https://<域名>` 200、证书有效 | 本地用自签名证书起完整栈（compose override 把 80/443 换到 18080/18443、证书挂 tmp/certs） | `curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}" http://127.0.0.1:18080/logs` → `301 -> https://127.0.0.1/logs`；`https://127.0.0.1:18443/login` → `200`，头里 `Server: nginx`（版本被 server_tokens off 藏掉）、`Strict-Transport-Security: max-age=31536000`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`X-Frame-Options: SAMEORIGIN`；`docker exec laity-nginx-prod nginx -t` → `syntax is ok / test is successful` | 本地 PASS；**线上域名与受信证书未验证**（无域名/证书） |
| 2 | 生产环境变量检查：口令非 root、密钥不复用（脱敏记录） | 新加 preflight 一次性容器做硬门禁；分别用 root 配置与合规配置跑 | root 配置：`上线门禁未通过：数据库用户仍是 root`，`root_gate_exit=1`；`docker compose ... up -d` 整体被拦停：`service "preflight" didn't complete successfully: exit 1`，`up_exit=1`，db 从未启动（`laity-db-prod Created` 而非 Up）。http 域名：`上线门禁未通过：NEXTAUTH_URL 必须是 https:// 开头的正式域名（当前：http://laity.example.com）`，`http_gate_exit=1`。合规配置：`上线门禁通过：数据库用户 laity_smoke、口令长度 28、https://laity.example.com`（只报长度不报值），`ok_gate_exit=0`。另外 compose 层 `${VAR:?}` 对空值也拦：`error while interpolating services.app.environment.NEXTAUTH_SECRET: required variable NEXTAUTH_SECRET is missing a value: 生产密钥，不得与开发环境复用`，`compose_exit=1` | PASS（本地即生效，上线同样生效） |
| 3 | 线上重跑 Phase 2 第 1 条（草稿隔离）与 Phase 4 第 3 条（哈希复核） | 在**容器里的生产镜像内**跑：`docker compose run --rm migrate` 建表 → 往 /app 拷探针脚本用镜像自带的 @prisma/client 灌数据 → 经 nginx 抓取 | 迁移：`1 migration found in prisma/migrations` / `Applying migration 20261030070530_init` / `All migrations have been successfully applied.`；哈希：`{"storedHash":"8eecb41728ff1bbc35791fdfb5561ce79f0245dd4ccc729a7474e49d10c6db38","recomputed":"8eecb417…","match":true,"publishedAt":"2026-10-30T09:59:37.200Z"}`；印章页 `CONTENT HASH · 8eecb41728ff1bbc35791fdfb5561ce79f0245dd4ccc729a7474e49d10c6db38`、`PUBLISHED AT · 2026-10-30 09:59 UTC`；草稿隔离：`/`、`/logs`、`/projects`、`/projects/probe6` 抓 `探测六草稿不可见` 命中全是 `0`，`/logs/probe6-draft` → `404`，`/logs/probe6-published` → `200` | 镜像内 PASS；**线上未验证**（同一镜像，缺线上环境这一层） |
| 4 | docs/04 软著材料成套 | 本轮未做 | — | 未验证（按计划等代码定稿后单独做） |
| 5 | docs/03 线上带地址栏截图 | 本轮未做 | — | 未验证（等线上） |

## 三、卡点：`npm ci` 在 linux 下判定 lockfile 不同步

- 现象：`docker build` 第一次死在 deps 阶段——
  `npm error code EUSAGE` / `` `npm ci` can only install packages when your package.json and package-lock.json are in sync`` / `Missing: @emnapi/runtime@1.11.3 from lock file`、`Missing: @emnapi/core@1.11.3 from lock file`。
- 排查：同一份 lockfile 在本地 Windows `npm ci --dry-run` 是**干净通过**的；在 `node:24-slim`（linux）里失败，且 `--omit=optional` 也一样失败（校验发生在解析之前）。差异来源是平台相关可选依赖：`@img/sharp-wasm32`、`@tailwindcss/oxide-wasm32-wasi`、`@unrs/resolver-binding-wasm32-wasi` 这些 wasm32 包要求 `@emnapi/*`，而 Windows 侧生成 lock 时没把这些边写进顶层。
- 处置（经我批准走 A 方案）：在 `node:24-slim` 容器里、限定 `--package-lock-only`（不装任何包）、`--registry https://registry.npmmirror.com`（与既有 resolved 同源）重算 lockfile。
- 差异核对（把重算结果与 HEAD 版本逐条比）：`包条目: 570 -> 578`、`删除的包: []`、`版本变化: []`、新增 8 条全是 `@emnapi/core`、`@emnapi/runtime` 及 `@tailwindcss/oxide-wasm32-wasi` 名下的嵌套 `@emnapi/*`、`@napi-rs/wasm-runtime`、`@tybys/wasm-util`、`tslib`；`old/new resolved hosts` 均为 `registry.npmmirror.com`；`lockfileVersion: 3 -> 3`。
- 双向验证：新 lock 在容器里 `npm ci --dry-run` 通过，在本地 Windows `npm ci --dry-run` 也通过（`224 packages are looking for funding`，退出 0）。替换前后我用 `cmp` 确认过仓库里的原文件未被我在验证过程中改动。

## 四、镜像内容与运行身份检查

`docker run --rm --entrypoint sh laity-archive:prod -c "ls -a; …"`：

- 目录只有 `.next`、`node_modules`、`package.json`、`public`、`server.js`；`ls -a | grep -c '^\.env'` → `0`（`.env` 没进上下文）；`ls src` → `No such file or directory`（源码不进镜像）；`ls node_modules/eslint` → `No such file or directory`（devDependencies 不进运行镜像）；`id` → `uid=1000(node)`。
- standalone 需要手工补的两项已在 Dockerfile 里做：`COPY --from=builder /app/.next/static ./.next/static`、`COPY --from=builder /app/public ./public`（Next 官方 output.md 明确 standalone 默认不含这两者）。

## 五、Prisma 引擎与 openssl

- 首跑出现 `prisma:warn Prisma failed to detect the libssl/openssl version to use, and may not work as expected. Defaulting to "openssl-1.1.x"`——`node:24-slim` 只有 libssl3，没有 `openssl` 可执行文件，Prisma 靠它判版本。
- 修法：deps 与 runner 两个阶段各加 `apt-get install -y --no-install-recommends openssl` 后重建。镜像内 `openssl version` → `OpenSSL 3.0.22 25 Aug 2026`；容器日志 `grep -icE "prisma:warn|openssl"` → `0`；重跑探针脚本输出里不再有该告警。
- 选 Debian slim 而不是 alpine 的原因写进了 Dockerfile 头部：musl 上 Prisma 还要处理 openssl provider，多一层不确定性。

## 六、编排与网络

| 检查 | 命令 | 结果 |
|---|---|---|
| db 是否对宿主机开端口 | `docker port laity-db-prod` | 空（只走容器网） |
| app 暴露面 | `docker port laity-app-prod` | `3000/tcp -> 127.0.0.1:3000`（外部流量必须经 nginx） |
| 数据库身份 | `docker exec laity-db-prod psql -U laity_smoke -d laity_smoke -tAc "select current_user, version()"` | `laity_smoke\|PostgreSQL 16.15 (Debian 16.15-1.pgdg13+2) on x86_64-pc-linux-gnu` |
| 容器健康 | `docker ps --filter name=laity-` | `laity-nginx-prod Up`、`laity-app-prod Up (healthy)`、`laity-db-prod Up (healthy)` |
| 空库下的 404 判定在容器里是否生效 | 起栈后立刻 `curl -sk -o /dev/null -w %{http_code} /projects/earth-mirror` | `404`（库里还没数据，Proxy 照常拦下） |
| 全路由复测（重建镜像后） | `/`、`/logs`、`/projects`、`/projects/probe6`、`/login` → `200`；`/admin` → `307`；`/logs/probe6-published` → `200`；`/logs/probe6-draft`、`/projects/nope6` → `404` | 与本地 `next start` 行为一致 |

## 七、未验证项

| 项 | 状态 | 原因与替代验证 |
|---|---|---|
| 线上 `curl -I https://<域名>` 200 + 证书受信 | 未验证 | 没有域名与证书。替代：本地用自签证书起完整栈验配置与跳转；`nginx -t` 通过；`ssl_certificate*` 路径与 compose 挂载点一致 |
| HTTP/2 是否真的协商上 | 未验证 | 配置里 `http2 on;` 通过 `nginx -t`，但我用 `curl -sI` 未带 `--http2`，`%{http_version}` 读到的还是 `1.1`。上线后需 `curl -kso /dev/null -w '%{http_version}' --http2 https://<域名>` 复测 |
| 基础镜像来源与官方一致性 | 未验证 | `docker.io` 直连超时（同 I007），改用 `docker.m.daocloud.io/library/...` 拉取后本地 `docker tag` 成 `node:24-slim`、`nginx:1.27-alpine`。摘要已留档：node `sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c`、nginx `sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10`；Dockerfile/compose 里写的仍是官方名，未把镜像站写进配置 |
| 生产 OAuth App 与正式回调 | 未验证 | 需要我本人建生产 OAuth App；`.env.production.example` 里已注明回调是 `https://<正式域名>/api/auth/callback/github` |
| 真实 GitHub 登录 + 后台写操作在线上跑通 | 未验证 | 同上，且依赖 I010 |
| docs/04 软著材料 | 本轮未做 | 代码仍在动，材料等定稿单独做，避免排版作废 |

## 八、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 越界文件 | `git status --short` 对照 DESIGN Phase 6 清单 | 新增 `Dockerfile`、`.dockerignore`、`docker-compose.prod.yml`、`deploy/nginx.conf`、`.env.production.example`，改 `next.config.ts`（D6 批准）；**清单外两处**：`package-lock.json`（第三节，已获我批准 A 方案）与 `.gitignore`（`.env.*` 又吞掉 `.env.production.example`，补一条 `!` 才能让模板入库，同 I006/I014 的机制） |
| build/CI 配置 | 只看 next.config.ts 的 diff | 仅新增 `output: "standalone"` 一行，`cacheComponents`、`partialPrefetching`、`turbopack.rules` 未动；没有 CI 配置改动 |
| lockfile | 逐条比对（第三节） | 570→578 条目，0 删除、0 版本变化，来源仍是 npmmirror |
| 密钥入库 | `git status --short` + `.dockerignore` 检查 | `.env.production.example` 只有键名与注释，无值；真实 `.env.production` 继续被忽略；镜像内 `.env` 计数 `0` |
| 依赖新增 | `package.json` 是否变化 | 未变（本轮没装任何新包） |
| 本地三件套 | `npm run lint` / `npx tsc --noEmit` / `npm run build` | 退出码 `0 / 0 / 0`（`✓ Compiled successfully in 5.3s`、`Finished TypeScript in 1382ms`、路由表仍含 `ƒ Proxy (Middleware)`） |
| 测试数据与资源回收 | `down -v` + 删临时文件 | 容器全部移除、`Volume laity-archive_laity_prod_data Removed`；`tmp/` 下的冒烟 env、自签证书、覆盖文件、探针脚本已删；本地 `package-lock.json` 在验证过程中先还原再按批准替换，中间状态用 `cmp` 确认过 |

## 九、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts 文件头注释 | `next.config.ts` 补了文件头（描述/作者/日期/修改记录），新文件都不是 .ts/.tsx，仍统一带中文注释头 |
| 修改的旧文件追加修改记录 | `next.config.ts` 追加 `- 2026-10-30: Phase 6 加 output: "standalone"（D6 批准的配置变更，仅这一项）`；`Dockerfile` 追加 openssl 补装那一行 |
| docs/01 研发日志 | 第十五节（npm ci 的平台差异坑、preflight 门禁为什么必须存在、镜像站来源留档） |
| 独立 commit | 待提交（等我说"提交"） |

## 十、结论

- 判定：**Phase 6 环境准备 PASS**——镜像能构建、能起、能在容器内复现草稿隔离与哈希复核，上线门禁在本地就拦得住 root 与 http 域名；`nginx -t`、编排、端口暴露面、运行身份全部实测。
- 仍挂在线上那半：域名/证书/生产 OAuth App/带地址栏截图（第 1b、2、3、5 条的线上部分）。
- 需要你处理的三件：① 服务器上把 `.env.production.example` 复制成 `.env.production` 填真实值；② 放好 `deploy/certs/laity.crt|key` 并把 `nginx.conf` 里的 `server_name` 换成正式域名；③ 在有官方网络的环境里把 `node:24-slim`、`nginx:1.27-alpine` 与官方逐层比对一次（第六节留了摘要）。
