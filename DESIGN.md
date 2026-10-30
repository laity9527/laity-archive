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
- 决策：页面服务端直读数据库；客户端组件只用在两处——编辑器（Editor）与登录按钮（SignInButton）。筛选器不走客户端，靠 URL 参数 + 服务端重渲染。
- 理由：内容站读多写少，RSC 天然免掉取数状态管理；被否备选 SWR/Redux——为两个交互点引入全局方案不成比例。登录按钮必须是客户端组件：NextAuth v4 的 OAuth 只能由带 csrfToken 的 POST 发起，而 csrf-token cookie 只在 `/api/auth/*` 的响应里铸造，服务端渲染的登录页首次访问时手里没有这个 cookie，填不进隐藏字段（`core/index.js` 的 `case "signin"` 里 GET 分支只会 307 到 `pages.signIn`，POST 分支才要 `csrfTokenVerified`）。
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
- 落地实况（2026-10-30 Phase 6 环境准备实测，细节见 Phase-6 环境准备自测表）：
  - 基础镜像 `node:24-slim` 而非 alpine：Prisma 引擎在 musl 上要额外处理 openssl provider，Debian 侧没这个坎；但 slim 只有 libssl3 没有 `openssl` 可执行文件，Prisma 启动时会退回 `openssl-1.1.x` 并告警，所以 deps 与 runner 两阶段都显式 `apt-get install openssl`。
  - 第四个构建目标 `migrator`：`docker compose run --rm migrate` 跑 `npx prisma migrate deploy`，把"改库"这个动作和 Web 容器的生命周期分开，Web 镜像里不留 prisma CLI。
  - standalone 默认不含 `public` 与 `.next/static`（Next 官方 output.md 明写要手工拷），由镜像内两条 COPY 补齐。
  - run 阶段用 node 镜像自带的 uid 1000 `node` 用户启动，`.dockerignore` 保证 `.env`、`.git`、`docs`、`node_modules`、`.next` 不进上下文。
  - 新增 **D12 上线门禁**（见下）后，编排里多一个一次性 `preflight` 服务。

### D12：上线门禁用一次性 preflight 容器硬卡，口令不合格就不起栈
- 决策：`docker-compose.prod.yml` 里 preflight 服务先跑，检查数据库用户/口令不是 root、两者不相同、口令不少于 12 位、`NEXTAUTH_URL` 是 https 且不含 localhost、`NEXTAUTH_SECRET` 不少于 32 位、`ALLOWED_GITHUB_IDS` 非空；db 服务 `depends_on: preflight (service_completed_successfully)`，任一条不合格整个 `up` 直接失败。
- 理由：风险清单里"弱口令遗留上线"要求的是**硬卡**，而 compose 的 `${VAR:?}` 只能拦空值——实测 `root/root` 能被照常放行（`config` 退出 0）。把判定放进容器启动链，比写在 README 里靠人自觉可靠。
- 代价：多一个一次性容器；检查项是字符串规则，换更强的口令策略要回来改这一处。
- 连带：通过时打印脱敏行（用户名 + 口令长度 + 域名，不打印值），正好充当验收第 2 条要的"脱敏检查记录"。

### D7：/logs/:slug 与 /projects/:slug 的真 404 由 Proxy 前置判定
- 决策：src/proxy.ts 的 matcher 为 `["/logs/:slug", "/projects/:slug", "/admin/:path*"]`；日志按"是否已发布"判定，项目按"slug 是否存在"判定（`select slug` 落在唯一索引上），未命中直接返回带 404 状态码的极简纸白页（noindex + no-store），文案按路由类型分别给出、请求里的 slug 一律不拼进 HTML。
- 理由：本项目开了 Cache Components（pPR），流式响应固定以 200 开头，页面级 notFound() 只能在正文已流式之后才执行，实测未发布日志与不存在项目都返回 200 + 错误页。Next 官方文档对动态路由真 404 的处方就是 Proxy 前置检查；rewrite 携带 status 实测同样被渲染路由的 200 覆盖，只有直接返回 Response 才保留状态码（两种写法都已实测）。
- 代价：每次详情类访问多一次 `select` 查询；Proxy 内不得依赖共享模块与全局状态；数据库不可用时该路由返回 500 而非 404（诚实失败，不做兜底）；接受。
- 连带：Phase 3 的鉴权文件由 src/middleware.ts 改为 src/proxy.ts，与本节同一文件扩展。Phase 5a 的 `/projects/:slug` 由我在 2026-10-30 批准扩入（I015），同时把该文件写进 5a 清单。

### D8：Phase 3 先用 JWT 会话，数据库会话留作后续可拓展项
- 决策：NextAuth v4 默认 JWT 会话，不建 Session/Account/User 表；会话里只放 `githubId` 与展示名，授权判定唯一依据仍是 `ALLOWED_GITHUB_IDS`。
- 理由：单人后台，白名单本身就是唯一的准入事实；JWT 免去每次请求查会话表，也不必为一个用户引入四张表的迁移。被否备选：v4 的 database session——adapter 与迁移的复杂度买到的是"服务端可即时吊销"，而本项目的吊销手段是改白名单（Proxy 每次请求都重新比对 env，收紧立即生效），这一条收益并不成立。
- 代价：JWT 在 `NEXTAUTH_SECRET` 泄露时可被伪造，因此该 secret 只允许放环境变量；单条已签发会话在过期前无法服务端撤销（改白名单只能阻止其访问 /admin，不能作废那枚 cookie）。
- 后续可拓展成数据库会话的路径（明确写出，未来照此执行）：① 依赖加 `@next-auth/prisma-adapter`（v4 配套版，MIT），停点报批；② schema 增 `User / Account / Session / VerificationToken` 四模型并 `migrate dev`；③ `authOptions` 追加 `adapter` 与 `session: { strategy: "database" }`；④ Proxy 里的 `getToken()` 只认 JWT，database 模式下必须改为按 cookie 查 Session 表（新增 `src/lib/session.ts`，这是改动量最大的一处）；⑤ 页面侧 `getServerSession(authOptions)` 与 `signIn` 回调逻辑不变。

### D9：已发布日志被编辑保存后自动退回草稿
- 决策：编辑任一已发布日志并保存，`isPublished` 一律置 false；旧的 `contentHash` 与 `publishedAt` 保留为"上次发布"历史，重新发布时按当前正文重算哈希并刷新时间。
- 理由：哈希只对发布那一刻的正文成立，正文一变印章就与内容脱钩，存证语义直接失效。保留旧值而不是清空，是为了后台能显示"上次发布于何时、哈希是什么"，不销毁证据。
- 代价：改一个错别字也会让日志短暂下线，必须手动再点一次发布；接受。
- 连带：Phase 4 编辑页据此显示"已发布的日志一保存就退回草稿"，并展示上一次发布的哈希与时间。

### D10：前台项目页的公开口径 = 字段白名单 + 只统计已发布日志
- 决策：`/projects` 列出全部项目（含零日志项目），`/projects/[slug]` 只列该项目 `isPublished: true` 的日志；公开查询用显式 `select` 白名单（slug、名称、类型、状态、简介、仓库地址，详情页另加 `createdAt`），不返回 `id`；日志条数与最近日期一律由 `getSafeLogs` / `where: { isPublished: true }` 得出。
- 理由：Project 模型没有发布开关，"哪些字段可以给访客看"只能由查询层说了算；靠 `include` 全量返回再在页面里挑，等于把以后加进表的私有字段默认发给访客。计数若走 `_count` 全量会把草稿数量也漏出去。
- 代价：项目本身无法"下线"（想藏一个项目只能删掉或改名）；将来若要给项目加发布开关，需改 schema 并同步这两处查询。
- 连带：数据层落在 src/lib/projects.ts（AGENTS.md 禁止页面直查库），已在 Phase 5a 清单里注明。

### D11：后台登录页自建，落点 /login 而不是 /admin/login
- 决策：`authOptions.pages = { signIn: "/login", error: "/login" }`，登录页与错误提示都在这一个页面里给；Proxy 与 admin 布局的未登录跳转都改成 `/login?callbackUrl=…`；`callbackUrl` 只接受本站相对路径（以 `/` 开头且不以 `//` 开头），否则回落 `/admin`。
- 理由：NextAuth v4 默认登录页自带主题样式（圆角、浅色卡片），与视觉铁律冲突，而且从 `/admin` 进去要多一次点击。放 `/admin/login` 会死循环——`pages.signIn` 一旦设置，`/api/auth/signin*` 的 GET 一律 307 到它，而该路径同时被 Proxy 的 `/admin/:path*` 与 admin 布局的会话守卫管辖，三者互相弹回；放到 `/login` 既不在 matcher 里也不吃 admin 布局。callbackUrl 两层兜底：我这层挡住协议相对与绝对外链，v4 的 `default-callbacks.js#redirect` 再挡一次非本站 origin。
- 代价：登录入口的 URL 与后台不同源命名（`/login` 而非 `/admin/login`）；多一个客户端组件（见 D3 的 CSRF 原因）；`/admin/:path*` 的守卫覆盖面因此少一条路径，但它本来就不该拦登录页。
- 连带：Phase 3 的"未登录访问 /admin → 跳转 GitHub 授权页"改为两跳语义——`/admin` → `/login` →（点一次按钮）→ GitHub 授权页；非白名单账号回到 `/login?error=AccessDenied` 并显示中文提示。

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

补做（2026-10-30 经我批准，I012-B / D11）：新建 src/app/login/page.tsx、src/components/SignInButton.tsx，
回改 src/auth.ts（pages）、src/proxy.ts 与 src/app/admin/layout.tsx（跳转目标），验收证据并入 Phase-3 自测表第九节。

前置动作（人工）：在 GitHub 创建 OAuth App（回调 http://localhost:3000/api/auth/callback/github），把 Client ID/Secret 填入本地 .env——外部账号操作由我本人执行。

验收标准：
1. 未登录访问 /admin → 跳到自建 /login，点一次"用 GITHUB 登录"即进 GitHub 授权页（D11 改的两跳语义）；
2. 白名单账号完成授权 → 进入 /admin；
3. 非白名单账号授权 → 被拒绝并回到 /login?error=AccessDenied 显示中文提示（用第二个账号或临时改白名单验证）；
4. 新建/编辑项目后 /admin/projects 列表即时可见；slug 重复返回 PRJ_002 提示；
5. 删除挂有日志的项目被拒绝（PRJ_001），删除空项目成功；
6. `npm run lint` / `npm run build` 通过。

### Phase 4：日志编辑与发布存证闭环
交付物：双栏 Markdown 编辑器；存草稿→前台不可见→发布→前台可见且带防伪印章的完整链路。

允许触碰的文件：
src/app/admin/logs/new/page.tsx、src/app/admin/logs/[id]/edit/page.tsx、
src/components/Editor.tsx、src/app/admin/log-actions.ts、src/lib/publish.ts、src/lib/logs.ts（补管理侧查询，独立于 getSafeLogs）、
src/app/admin/page.tsx（2026-10-30 经我批准：最近动态加编辑链接、底部加新建入口）

验收标准：
1. 新建草稿（含 BEFORE/AFTER）保存成功，前台三页不可见；
2. 点击发布后前台可见，详情页印章显示哈希与时间；
3. 哈希复核：用命令对库中 title/beforeContent/afterContent 按 D5 口径计算 SHA-256，与 contentHash 完全一致（验收时粘贴两侧值）；
4. publishedAt 为服务器 UTC 时间（与本地时间差符合时区偏移）；
5. slug 重复保存返回 LOG_001；未登录直调 Server Action 返回 AUTH_001；
6. `npm run lint` / `npm run build` 通过。

### Phase 5：P1 增强——OSS 图片 + 项目维度页面
交付物：编辑器可传图得外链；/projects 与 /projects/[slug] 上线。

> 2026-10-30 经我批准拆段：OSS 的前置动作（开 Bucket、配 RAM 密钥）是外部账号与计费操作，
> 不由 AI 执行，故本 Phase 拆成 **5a 项目维度页**（不依赖 OSS，先做先验收）与 **5b OSS 传图**
> （待密钥就绪再做）。原风险清单"OSS 受阻则 Phase 5 顺延"据此收窄为"5b 顺延"。

**5a 允许触碰的文件**：
src/app/projects/page.tsx、src/app/projects/[slug]/page.tsx、
src/lib/projects.ts（2026-10-30 补：AGENTS.md 禁止页面直查库，公开侧查询必须有 src/lib 落点，
故在此加 listPublicProjects / getPublicProjectBySlug 两个只返回公开字段、日志只计已发布的函数，
以及 Proxy 用的 isProjectSlug）、
src/proxy.ts（2026-10-30 经我批准：matcher 增 `/projects/:slug`，404 文案按路由类型分开给，见 D7 与 I015）

**5a 验收标准**：
1. /projects 列出全部项目（含零日志项目，计数为 0）；
2. /projects/[slug] 显示该项目已发布日志，草稿在任何前台页都不可见、也不计入条数；
3. 不存在的 slug 返回 404 状态码（经批准由 Proxy 前置判定，见 D7）；
4. `npm run lint` / `npm run build` 通过。

**5b 允许触碰的文件**：
src/lib/oss.ts、src/app/admin/upload-action.ts、src/components/Editor.tsx（接入上传）、
next.config.ts（images.remotePatterns 增 OSS 域名，经本 DESIGN 批准）

**5b 前置动作（人工）**：开通阿里云 OSS Bucket、配置 RAM 子账号最小权限密钥，填入 .env——外部账号与计费操作由我本人执行，AI 停点等待。

**5b 依赖已批准（2026-10-30）**：走 A 方案 `ali-oss@6.23.0`（MIT，最近发布 2025-12-17）。`npm install --dry-run` 实测新增 **68** 个包，直接依赖含 lodash、urllib@2、xml2js、ws、socks 等；装之前逐个核许可证（GPL/AGPL 一律拒），装完把 package.json 与 package-lock.json 的变化一并上报，含被删条目。被否备选：B `@alicloud/oss20190517@1.0.6`（Apache-2.0，dry-run 47 个包，发布更旧 2024-09-17）；C 零依赖自写 V4 签名 PUT（0 个包，但签名细节要等真库联调才暴露，官方文档也写明优先用 SDK）。

**5b 验收标准**：
1. 编辑器上传 png 返回 OSS 外链，正文引用可显示；服务器本地目录无新增图片文件；
2. 上传 .exe 或 6MB 文件被拒绝（IMG_001）。

### Phase 6：生产部署 + 软著材料整理
交付物：自有服务器上 HTTPS 可访问的生产站点；docs/04 软著材料成套。

> 2026-10-30 经我批准拆段：**6a 环境准备**（构建产物 + 编排 + 反代 + 上线门禁，全部能在本机验）先做完；
> **6b 真上线 + 软著材料**等服务器、域名、证书、生产 OAuth App 就位。原"每个 Phase 只做该 Phase"
> 的红线不变，本节只动了 Phase 6 自己的清单。

允许触碰的文件：
Dockerfile、.dockerignore、docker-compose.prod.yml、deploy/nginx.conf、
next.config.ts（output: "standalone"，经 D6 批准）、docs/04-软著材料/*

6a 清单外增补（2026-10-30 经我批准，逐条见 Phase-6 环境准备自测表第八节）：
- `.env.production.example`：生产变量模板，让"该填哪些键"进仓库、真实值继续被忽略；
- `.gitignore`：`.env.*` 规则会连模板一起吞掉（同 I006/I014 的机制），补 `!.env.production.example`；
- `package-lock.json`：`npm ci` 在 linux 下判 lock 与 package.json 不同步（Windows 侧看不出来，
  缺的是 wasm32 可选依赖的边），按 A 方案在 `node:24-slim` 容器里用 `--package-lock-only` 重算，
  实测 570→578 条目、0 删除、0 版本变化、来源仍是 registry.npmmirror.com，容器与本地两侧 `npm ci --dry-run` 均通过；
- `Dockerfile` 的 deps/runner 两处 `apt-get install openssl`：Prisma 靠 openssl 可执行文件判引擎版本，
  slim 镜像只有 libssl3，不装会退回 openssl-1.1.x 并告警（D6 落地实况）。

前置动作（人工）：服务器就绪、域名解析、生产级数据库口令生成、生产 OAuth App（回调为正式域名）——全部由我本人执行。

验收标准：
1. `docker build` 成功（6a 本机已验）；生产容器启动后 `curl -I https://<域名>` 返回 200，证书有效（6b）；
2. 生产环境变量检查：数据库口令非 root、密钥不与开发环境复用（粘贴脱敏检查记录）——由 D12 的 preflight 硬卡并打印脱敏行；
3. 线上重跑 Phase 2 验收第 1 条（草稿隔离）与 Phase 4 第 3 条（哈希复核）均 PASS（6a 已在容器化的同一镜像内复现，6b 需线上再跑一次）；
4. docs/04 含源代码文档（按软著要求前 30 页 + 后 30 页排版）与操作说明书（6b）；
5. docs/03 存线上带地址栏截图（6b）。

## 三、风险清单

| 风险 | 触发条件 | 降级/应对 |
|---|---|---|
| Next.js 实际版本 API 与记忆不符 | 写码时报废弃/不存在 API | 停下读 node_modules/next/dist/docs/ 对应指南；禁止凭记忆修补 |
| GitHub OAuth 回调域名限制 | 生产域名与本地回调不一致 | 开发与生产各建一个 OAuth App，环境变量隔离 |
| OSS 开通/计费受阻 | Phase 5 前置动作卡住 | Phase 5 顺延，不阻塞 Phase 6 之外的任何已验收产物；正文暂用免版权图库外链 |
| 小内存服务器构建 OOM | 服务器上直接 build 失败 | 本地/CI 构建镜像后推送，服务器只 pull + run（D6 已按此设计） |
| 弱口令遗留上线 | Phase 6 环境检查发现 root 口令 | 已落地为 D12：编排里的 preflight 一次性容器硬卡，口令/域名/密钥不合格则整个 `up` 失败，不放行 |
| 时区错乱复发 | 任何页面时间显示偏移 | 全链路 UTC（AGENTS.md 已锁），验收含时区核对项 |
| 单人项目密钥泄露 | .env 被提交 | .gitignore 已忽略；独立验收含"git 历史无密钥"检查 |

## 四、里程碑与回滚

- 每个 Phase 验收 PASS 后立即 commit（消息含 Phase 编号），出问题 `git revert` 该 Phase 即可，不跨 Phase 连环回滚；
- Phase 4 完成即达成"可用产品"（能写能发能存证），Phase 5/6 是增强与交付，即使暂停也不影响核心闭环；
- 全程遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md。