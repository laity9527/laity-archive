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
| I009 | 2026-10-30 | NextAuth 锁定 v4.24.15，而 Next 16 官方示例以 v5（Auth.js）为主；v4 在 App Router 下可用（route handler + getServerSession + getToken 均验证过），但与 v5 的 cookie 名、API 名称不同 | 后续若要升 v5 需改登录入口、会话语义与 Proxy 读取方式 | OPEN | 维持 v4；升级另立需求，升级时同步改 D8 的会话策略说明 |
| I010 | 2026-10-30 | 凭据已填（Client ID/Secret/白名单 111046902 均在本地 `.env`），但真实 GitHub 账号授权需我本人在浏览器登录，AI 侧浏览器没有 GitHub 会话 | Phase 3 验收第 2 条仍无法由 AI 端到端验证 | PLANNED（Phase 3 回填） | 我用浏览器走一次授权后，回填 Phase-3 自测表第 2 条与登录态截图 |
| I011 | 2026-10-30 | 退出入口是 `<a href="/api/auth/signout">`，触发 `@next/next/no-html-link-for-pages`；换 `Link` 拿不到 RSC、换 POST 表单缺 v4 的 csrfToken 入口 | 需在该行禁用 lint 规则（全仓库唯一一处） | OPEN | 现状可接受；若日后升级 v5（其 signOut 可从客户端组件调用），顺带消除这处禁用 |
| I012 | 2026-10-30 | NextAuth v4 的 OAuth 只能由带 CSRF token 的表单 POST 发起，GET `/api/auth/signin/github` 只返回自带主题的登录页：进后台多一次点击，且该页圆角/浅色与本项目视觉铁律不一致 | 登录入口体验与品牌一致性打折 | PLANNED（已定：先 A 后 B） | 2026-10-30 我拍板先按 A 走（保留 NextAuth 默认页，Phase 3 按现状验收），B 自建 `/admin/login` 排到后面单独做——届时需 `pages.signIn` 指向新页并新增该文件（清单外，另立任务） |
| I013 | 2026-10-30 | 未登录直调 Server Action 的 HTTP 探针被运行时安全策略判为越权测试并拦下，未执行；而 Proxy 的 matcher 覆盖 `/admin/:path*`，未登录请求根本到不了 action，`AUTH_001` 分支在 HTTP 层不可达 | Phase 4 验收第 5 条后半段只验证到 Proxy 层拦截 | OPEN | 保留 action 内的 `getServerSession` 作为第二道防线；若日后收窄 Proxy matcher，必须先补这条验证（用测试环境或单元测试，不再用生产端点试探） |
| I014 | 2026-10-30 | I006 复发：`logs` 规则同样忽略 `src/app/admin/logs/`，Phase 4 的 new / [id]/edit 两页在 `git status` 里不出现 | 若不处理，Phase 4 的编辑页会静默漏提交 | FIXED（2026-10-30，随 Phase 4 提交） | `.gitignore` 末尾补 `!src/app/admin/logs/`、`!src/app/admin/logs/**`；用 `git check-ignore -q` 逐文件确认已不被忽略、`git ls-files --others` 能列出两页。根因是模板规则按目录名匹配，后续任何新目录名叫 `logs` 都要先验一次 |