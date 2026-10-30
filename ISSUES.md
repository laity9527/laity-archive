# ISSUES：范围外问题台账

规则：任何 Phase 中发现的范围外问题记到这里，不动手改；由我决定何时立项处理。
状态：OPEN / PLANNED（已排入某 Phase）/ FIXED（注明 commit）/ WONTFIX（注明理由）

| 编号 | 发现日期 | 问题描述 | 影响 | 状态 | 处置 |
|---|---|---|---|---|---|
| I001 | 2026-10-30 | 此前外部方案生成的 docker-compose 草稿使用已废弃的 version 字段、root/root 弱口令 | 本地开发可用，上线前必须改 | PLANNED | Phase 1 建库时去掉 version 字段；生产口令在 Phase 6 上线门禁强制更换 |
| I002 | 2026-10-30 | 此前外部方案按 Next.js 14 旧 API 编写骨架代码，与本项目实际版本可能不符 | 骨架代码不可直接采信 | PLANNED | Phase 1 脚手架就绪后以 node_modules/next/dist/docs/ 为准重写，旧骨架仅作参考 |
| I003 | 2026-10-30 | AGENTS.md 登录行仍写"NextAuth.js（仅此一处）"，未反映已确认的 GitHub OAuth + 白名单决策 | 事实基座与 SPEC 有细微不同步 | OPEN | 待我批准后更新该行 |
| I004 | 2026-10-30 | 本机 WSL2 未安装，Docker Desktop Linux 引擎无法启动，Phase 1 数据库相关验收全部阻塞 | 无法建库、迁移、种子、页面真数据验证 | OPEN | 需我本人执行 `wsl --install` 并重启，装完后回填 Phase 1 自测表 |
| I005 | 2026-10-30 | Prisma 最新稳定版为 7.x（生成器/配置文件体系变更），项目锁定 6.19.3 以匹配既定 schema 写法 | 后续升级 Prisma 需单独评估 | OPEN | 维持 6.19.3，升级另立需求 |
| I006 | 2026-10-30 | .gitignore 里 Node 模板的 `logs` 规则把源码目录 `src/app/logs/` 整体忽略，Phase 1 的日志页与 Phase 2 的详情页均未入库 | 远端仓库缺 /logs 路由，clone 后构建行为与本地不一致 | FIXED（本次 Phase 2 提交） | 在 .gitignore 末尾显式 `!src/app/logs/` 重新纳入；提交时核对 `git status` 确认两页入库 |