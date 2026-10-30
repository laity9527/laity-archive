# DESIGN：Laity 项目档案库架构与分阶段路线图

作者：张磊
创建日期：2026-10-30
状态：待确认（门禁 3）
上游：SPEC.md（待门禁 2 确认）、AGENTS.md

---

## 一、架构决策记录

凡 AGENTS.md / SPEC.md 已锁定事项（技术栈、视觉、OAuth、部署目标）不在此重新决策，只记录剩余自由度上的选择。

### D1：写操作走 Server Actions，不另建 REST API 层
- 决策：全部写操作（存草稿/发布/项目管理/上传）用 Server Actions。
- 理由：单体单人项目，Server Actions 省掉 API 路由、鉴权中间件重复接线和前后端两套类型；被否备选是 REST Route Handlers——多一层契约维护，收益只有"未来可能开放 API"，属于 hypothetical。
- 代价：未来若真要开放公开 API 需补一层；接受。

### D2：鉴权用 NextAuth GitHub Provider + 服务端白名单
- 决策：signIn 回调里校验 GitHub 账号 ID 是否在环境变量白名单（ALLOWED_GITHUB_IDS）内，不在即拒绝；/admin 全路由由 proxy 保护（Next 16 已将 middleware 更名 Proxy，见 D7）。
- 理由：不存密码、不做注册找回；白名单用不可变的账号 ID 而非用户名（用户名可改）；被否备选 Credentials——自己管哈希与防爆破，纯增风险。
- 代价：依赖 GitHub 可用性；GitHub 挂了我也进不了后台，但访客不受影响，接受。

### D3：渲染以 RSC 为主，不引入客户端状态库
- 决策：页面服务端直读数据库；仅编辑器、筛选器两个交互点用客户端组件。
- 理由：内容站读多写少，RSC 天然免掉取数状态管理；被否备选 SWR/Redux——为两个交互点引入全局方案不成比例。
- 代价：筛选切换走 URL 参数 + 服务端重渲染，交互延迟略高；内容站可接受。

### D4：Markdown 渲染管线固定为 react-markdown + rehype-sanitize
- 决策：封装 src/lib/markdown.tsx 唯一出口，页面禁止自行拼装渲染器。
- 理由：把"必过 sanitize"从纪律变成结构——只有一个出口就只有一个检查点；被否备选 dangerouslySetInnerHTML + 手动清洗，已被红线禁止。
- 代价：react-markdown 的组件映射要自己写样式；一次工作，长期受益。

### D5：防伪哈希口径 = SHA-256( title + "\n" + beforeContent + "\n" + (afterContent ?? "") )
- 决策：哈希覆盖标题与双正文，UTF-8 编码，发布时计算；重新发布（内容有变）则重算并更新 publishedAt。
- 理由：只哈希正文会漏掉标题篡改；口径必须现在定死，否则日后无法复核历史印章。
- 代价：改标题也算"内容变更"需重发布；符合存证语义，接受。

### D6：生产镜像用多阶段构建 + Next.js standalone 输出
- 决策：Dockerfile 三阶段（deps → build → run），run 阶段仅含 standalone 产物与静态资源。
- 理由：小内存服务器防 OOM，镜像体积小；被否备选完整 node_modules 进镜像——体积与内存双输。
- 代价：next.config 需设 output: "standalone"（该配置变更列入 Phase 6 文件清单，经本 DESIGN 批准）；接受。

### D7：/logs/:slug 的真 404 由 Proxy 前置判定
- 决策：新增 src/proxy.ts，matcher 只匹配 `/logs/:slug`；命中已发布日志则放行，未命中直接返回带 404 状态码的极简纸白页（noindex + no-store）。
- 理由：本项目开了 Cache Components（pPR），流式响应固定以 200 开头，页面级 notFound() 只能在正文已流式之后才执行，实测未发布 slug 返回 200 + 错误页。Next 官方文档对动态路由真 404 的处方就是 Proxy 前置检查；rewrite 携带 status 实测同样被渲染路由的 200 覆盖，只有直接返回 Response 才保留状态码（两种写法都已实测）。
- 代价：每次详情页访问多一次 `select id` 数据库查询；Proxy 内不得依赖共享模块与全局状态；数据库不可用时该路由返回 500 而非 404（诚实失败，不做兜底）；接受。
- 连带：Phase 3 的鉴权文件由 src/middleware.ts 改为 src/proxy.ts，与本节同一文件扩展。

### D8：Phase 3 先用 JWT 会话，数据库会话留作后续可拓展项
- 决策：NextAuth v4 默认 JWT 会话，不建 Session/Account/User 表；会话里只放 `githubId` 与展示名，授权判定唯一依据仍是 `ALLOWED_GITHUB_IDS`。
- 理由：单人后台，白名单本身就是唯一的准入事实；JWT 免去每次请求查会话表，也不必为一个用户引入四张表的迁移。被否备选：v4 的 database session——adapter 与迁移的复杂度买到的是"服务端可即时吊销"，而本项目的吊销手段是改白名单（Proxy 每次请求都重新比对 env，收紧立即生效），这一条收益并不成立。
- 代价：JWT 在 `NEXTAUTH_SECRET` 泄露时可被伪造，因此该 secret 只允许放环境变量；单条已签发会话在过期前无法服务端撤销（改白名单只能阻止其访问 /admin，不能作废那枚 cookie）。
- 后续可拓展成数据库会话的路径（明确写出，未来照此执行）：① 依赖加 `@next-auth/prisma-adapter`（v4 配套版，MIT），停点报批；② schema 增 `User / Account / Session / VerificationToken` 四模型并 `migrate dev`；③ `authOptions` 追加 `adapter` 与 `session: { strategy: "database" }`；④ Proxy 里的 `getToken()` 只认 JWT，database 模式下必须改为按 cookie 查 Session 表（新增 `src/lib/session.ts`，这是改动量最大的一处）；⑤ 页面侧 `getServerSession(authOptions)` 与 `signIn` 回调逻辑不变。

## 二、分阶段路线图（6 个 Phase，每个都是可运行最小闭环）

通则：每个 Phase 开新会话 + 执行指令卡；完成后独立验收 → git commit → 截图/日志归档。
文件清单为核心受控文件（脚手架自动生成的配套文件以实际为准）；清单外一律不动。

---

### Phase 1：环境就绪 + 一条真数据的最小闭环
交付物：本地能跑的开发环境；数据库里 1 个项目 1 条日志；/logs 页面从数据库读出这条真数据并按纸白风渲染。

允许触碰的文件：
package.json、docker-compose.yml、prisma/schema.prisma、prisma/seed.ts、
src/lib/db.ts、src/app/layout.tsx、src/app/globals.css、src/app/page.tsx（占位版）、
src/app/logs/page.tsx（最小版）、next.config.ts、tsconfig.json、.env.example

前置动作（人工，按 docs/00-开发方法论/环境搭建指南.md）：安装 Node LTS、Docker Desktop；git 关联远端仓库。
注意：脚手架用 create-next-app 生成后，写代码前先读 node_modules/next/dist/docs/ 对应指南（版本红线）。

验收标准（可执行命令 + 预期输出）：
1. `node -v` 输出 ≥ v22；`docker ps` 含 laity-postgres 且状态 Up；
2. `npx prisma migrate dev` 成功生成迁移文件且无报错；
3. `npx prisma db seed` 后 `npx prisma studio` 可见 1 个 Project、1 条 Log（isPublished=true）；
4. 浏览器访问 http://localhost:3000/logs 显示种子日志标题；改库中标题刷新页面随之变化（证明非 Mock）；
5. `npm run build` 退出码 0；
6. docs/01-研发日志 有当日环境搭建记录，docs/03 有带地址栏截图。

### Phase 2：前台三页完整版 + 安全封装
交付物：首页/日志大厅/详情三页全部读真库，视觉铁律全量落地，草稿隔离与 sanitize 生效。

允许触碰的文件：
src/lib/logs.ts（getSafeLogs/getSafeLogBySlug/isPublishedLogSlug）、src/lib/markdown.tsx、
src/app/page.tsx、src/app/logs/page.tsx、src/app/logs/[slug]/page.tsx、src/proxy.ts（经 D7 批准新增）、
src/components/Timeline.tsx、src/components/StatusBoard.tsx、src/components/Seal.tsx、
src/app/globals.css、src/app/layout.tsx（字体接入）

验收标准：
1. 造一条 isPublished=false 的草稿：/、/logs 均不出现，直访其 /logs/[slug] 返回 404（状态码由 D7 的 Proxy 保证，不是 200 + 404 页面）；
2. 详情页显示 contentHash 与 publishedAt（种子数据先手动填一个合法哈希供展示）；
3. 正文含 `<script>alert(1)</script>` 的日志渲染后无脚本执行（查看页面源码确认被清洗）；
4. `grep -rE "rounded-(?!none)|shadow-(?!none)|bg-gradient" src/` 零命中；无图标库 import；
5. 浏览器 375px 宽度三页均无横向滚动条；
6. `npm run lint` 零 error，`npm run build` 通过。

### Phase 3：后台鉴权 + 项目管理
交付物：GitHub OAuth 登录闭环，白名单生效，/admin 概览与项目增改删可用。

允许触碰的文件：
src/auth.ts、src/proxy.ts（在 D7 的 matcher 上扩展 /admin）、src/app/api/auth/[...nextauth]/route.ts、
src/app/admin/layout.tsx、src/app/admin/page.tsx、src/app/admin/projects/page.tsx、
src/app/admin/project-actions.ts、src/lib/projects.ts、.env.example

前置动作（人工）：在 GitHub 创建 OAuth App（回调 http://localhost:3000/api/auth/callback/github），把 Client ID/Secret 填入本地 .env——外部账号操作由我本人执行。

验收标准：
1. 未登录访问 /admin → 跳转 GitHub 授权页；
2. 白名单账号完成授权 → 进入 /admin；
3. 非白名单账号授权 → 被拒绝并回到首页（用第二个账号或临时改白名单验证）；
4. 新建/编辑项目后 /admin/projects 列表即时可见；slug 重复返回 PRJ_002 提示；
5. 删除挂有日志的项目被拒绝（PRJ_001），删除空项目成功；
6. `npm run lint` / `npm run build` 通过。

### Phase 4：日志编辑与发布存证闭环
交付物：双栏 Markdown 编辑器；存草稿→前台不可见→发布→前台可见且带防伪印章的完整链路。

允许触碰的文件：
src/app/admin/logs/new/page.tsx、src/app/admin/logs/[id]/edit/page.tsx、
src/components/Editor.tsx、src/app/admin/log-actions.ts、src/lib/publish.ts、src/lib/logs.ts（补管理侧查询，独立于 getSafeLogs）

验收标准：
1. 新建草稿（含 BEFORE/AFTER）保存成功，前台三页不可见；
2. 点击发布后前台可见，详情页印章显示哈希与时间；
3. 哈希复核：用命令对库中 title/beforeContent/afterContent 按 D5 口径计算 SHA-256，与 contentHash 完全一致（验收时粘贴两侧值）；
4. publishedAt 为服务器 UTC 时间（与本地时间差符合时区偏移）；
5. slug 重复保存返回 LOG_001；未登录直调 Server Action 返回 AUTH_001；
6. `npm run lint` / `npm run build` 通过。

### Phase 5：P1 增强——OSS 图片 + 项目维度页面
交付物：编辑器可传图得外链；/projects 与 /projects/[slug] 上线。

允许触碰的文件：
src/lib/oss.ts、src/app/admin/upload-action.ts、src/components/Editor.tsx（接入上传）、
src/app/projects/page.tsx、src/app/projects/[slug]/page.tsx、next.config.ts（images.remotePatterns 增 OSS 域名，经本 DESIGN 批准）

前置动作（人工）：开通阿里云 OSS Bucket、配置 RAM 子账号最小权限密钥，填入 .env——外部账号与计费操作由我本人执行，AI 停点等待。

验收标准：
1. 编辑器上传 png 返回 OSS 外链，正文引用可显示；服务器本地目录无新增图片文件；
2. 上传 .exe 或 6MB 文件被拒绝（IMG_001）；
3. /projects 列出全部项目，/projects/[slug] 显示该项目已发布日志（草稿仍不可见）；
4. `npm run lint` / `npm run build` 通过。

### Phase 6：生产部署 + 软著材料整理
交付物：自有服务器上 HTTPS 可访问的生产站点；docs/04 软著材料成套。

允许触碰的文件：
Dockerfile、.dockerignore、docker-compose.prod.yml、deploy/nginx.conf、
next.config.ts（output: "standalone"，经 D6 批准）、docs/04-软著材料/*

前置动作（人工）：服务器就绪、域名解析、生产级数据库口令生成、生产 OAuth App（回调为正式域名）——全部由我本人执行。

验收标准：
1. `docker build` 成功；生产容器启动后 `curl -I https://<域名>` 返回 200，证书有效；
2. 生产环境变量检查：数据库口令非 root、密钥不与开发环境复用（粘贴脱敏检查记录）；
3. 线上重跑 Phase 2 验收第 1 条（草稿隔离）与 Phase 4 第 3 条（哈希复核）均 PASS；
4. docs/04 含源代码文档（按软著要求前 30 页 + 后 30 页排版）与操作说明书；
5. docs/03 存线上带地址栏截图。

## 三、风险清单

| 风险 | 触发条件 | 降级/应对 |
|---|---|---|
| Next.js 实际版本 API 与记忆不符 | 写码时报废弃/不存在 API | 停下读 node_modules/next/dist/docs/ 对应指南；禁止凭记忆修补 |
| GitHub OAuth 回调域名限制 | 生产域名与本地回调不一致 | 开发与生产各建一个 OAuth App，环境变量隔离 |
| OSS 开通/计费受阻 | Phase 5 前置动作卡住 | Phase 5 顺延，不阻塞 Phase 6 之外的任何已验收产物；正文暂用免版权图库外链 |
| 小内存服务器构建 OOM | 服务器上直接 build 失败 | 本地/CI 构建镜像后推送，服务器只 pull + run（D6 已按此设计） |
| 弱口令遗留上线 | Phase 6 环境检查发现 root 口令 | 上线门禁硬卡：口令不改不发版 |
| 时区错乱复发 | 任何页面时间显示偏移 | 全链路 UTC（AGENTS.md 已锁），验收含时区核对项 |
| 单人项目密钥泄露 | .env 被提交 | .gitignore 已忽略；独立验收含"git 历史无密钥"检查 |

## 四、里程碑与回滚

- 每个 Phase 验收 PASS 后立即 commit（消息含 Phase 编号），出问题 `git revert` 该 Phase 即可，不跨 Phase 连环回滚；
- Phase 4 完成即达成"可用产品"（能写能发能存证），Phase 5/6 是增强与交付，即使暂停也不影响核心闭环；
- 全程遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md。