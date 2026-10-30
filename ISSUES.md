# ISSUES：范围外问题台账

规则：任何 Phase 中发现的范围外问题记到这里，不动手改；由我决定何时立项处理。
状态：OPEN / PLANNED（已排入某 Phase）/ FIXED（注明 commit）/ WONTFIX（注明理由）

| 编号 | 发现日期 | 问题描述 | 影响 | 状态 | 处置 |
|---|---|---|---|---|---|
| I001 | 2026-10-30 | 此前外部方案生成的 docker-compose 草稿使用已废弃的 version 字段、root/root 弱口令 | 本地开发可用，上线前必须改 | PLANNED | Phase 1 建库时去掉 version 字段；生产口令在 Phase 6 上线门禁强制更换 |
| I002 | 2026-10-30 | 此前外部方案按 Next.js 14 旧 API 编写骨架代码，与本项目实际版本可能不符 | 骨架代码不可直接采信 | PLANNED | Phase 1 脚手架就绪后以 node_modules/next/dist/docs/ 为准重写，旧骨架仅作参考 |
| I003 | 2026-10-30 | AGENTS.md 登录行仍写"NextAuth.js（仅此一处）"，未反映已确认的 GitHub OAuth + 白名单决策 | 事实基座与 SPEC 有细微不同步 | OPEN | 待我批准后更新该行 |