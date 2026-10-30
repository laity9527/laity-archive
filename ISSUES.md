# ISSUES：范围外问题台账

规则：任何 Phase 中发现的范围外问题记到这里，不动手改；由我决定何时立项处理。
状态：OPEN / PLANNED（已排入某 Phase）/ FIXED（注明 commit）/ WONTFIX（注明理由）

| 编号 | 发现日期 | 问题描述 | 影响 | 状态 | 处置 |
|---|---|---|---|---|---|
| I001 | 2026-10-30 | 此前外部方案生成的 docker-compose 草稿使用已废弃的 version 字段、root/root 弱口令 | 本地开发可用，上线前必须改 | PLANNED | Phase 1 建库时去掉 version 字段；生产口令在 Phase 6 上线门禁强制更换 |
| I002 | 2026-10-30 | 此前外部方案按 Next.js 14 旧 API 编写骨架代码，与本项目实际版本可能不符 | 骨架代码不可直接采信 | PLANNED | Phase 1 脚手架就绪后以 node_modules/next/dist/docs/ 为准重写，旧骨架仅作参考 |
| I003 | 2026-10-30 | AGENTS.md 登录行仍写"NextAuth.js（仅此一处）"，未反映已确认的 GitHub OAuth + 白名单决策 | 事实基座与 SPEC 有细微不同步 | OPEN | 待我批准后更新该行 |
| I004 | 2026-10-30 | 本机 WSL2 未安装，Docker Desktop Linux 引擎无法启动，Phase 1 数据库相关验收全部阻塞 | 无法建库、迁移、种子、页面真数据验证 | FIXED（2026-10-30，非代码修复） | 我本人装好 WSL2（默认版本 2）后，Docker Desktop 后端因启动早于 WSL2 就绪仍卡住，`docker desktop stop/start` 后恢复；迁移、种子、真数据验证已在 Phase 1 自测表第 2–5 条回填为 PASS |
| I005 | 2026-10-30 | Prisma 最新稳定版为 7.x（生成器/配置文件体系变更），项目锁定 6.19.3 以匹配既定 schema 写法 | 后续升级 Prisma 需单独评估 | OPEN | 维持 6.19.3，升级另立需求；6.19.3 已提示 `package.json#prisma` 将在 7.x 弃用，升级时 seeds 配置需迁到 prisma.config.ts |
| I006 | 2026-10-30 | .gitignore 里 Node 模板的 `logs` 规则把源码目录 `src/app/logs/` 整体忽略，Phase 1 的日志页与 Phase 2 的详情页均未入库 | 远端仓库缺 /logs 路由，clone 后构建行为与本地不一致 | FIXED（本次 Phase 2 提交） | 在 .gitignore 末尾显式 `!src/app/logs/` 重新纳入；提交时核对 `git status` 确认两页入库 |
| I007 | 2026-10-30 | registry-1.docker.io 直连超时（本机无代理），Docker Hub 拉不到 postgres:16 | 建库阻塞 | FIXED（环境处置，非代码） | 经我确认改用 daocloud 镜像站拉取（digest `sha256:1beaa308…77c61c`）后本地 `docker tag` 成 `postgres:16`，未改 Docker 配置文件；镜像来源未与官方逐层比对，如需强来源可在有代理时重拉覆盖 |
| I008 | 2026-10-30 | `prisma generate` 报 `EPERM: rename …query_engine-windows.dll.node`，因探针遗留的 4 个 `next start` 进程占用该 DLL | 客户端无法生成 | FIXED（环境处置） | 结束遗留进程后重跑成功；已写入环境指南已知坑，后续探针用完必须连子进程一起结束 |