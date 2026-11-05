# DESIGN：Laity 项目档案库架构与分阶段路线图

作者：张磊
创建日期：2026-10-30
状态：待确认（门禁 3）
上游：SPEC.md（待门禁 2 确认）、AGENTS.md
维护留痕：2026-11-05 按负责人点名"根据你的经验及相关文件继续修改"，新增「零、架构总览」「决策记录模板」
与「决策索引（D1–D29 一览）」；既有 D1–D29 正文与路线图未改动。
维护留痕续：2026-11-05 按负责人点名"重新给出五份文档"，末尾新增「五、技术债与待还项」「六、未验证项
（待实测）清单」；既有决策正文与路线图未改动。
维护留痕续二：2026-11-05 按负责人点名"视觉令牌是否切换 根据你的经验判断；新增 /about 关于页"，新增 D30
（视觉令牌切换裁决）、D31（新增 /about 关于页）两则决策并同步决策索引；既有 D1–D29 正文、路线图、技术债与
未验证清单未改动。状态仍为「待确认（门禁 3）」（负责人指示暂保留）。
维护留痕续三：2026-11-05 按负责人点名"重写 SPEC 与 DESIGN"：「零、架构总览」补文档体系定位与单一来源声明、
新增「零·补、历史决策裁剪说明」（D2→D20 的取代关系与 V2.0 多用户形态的搁置边界）、「二、分阶段路线图」
补执行档案定位（Phase 1–7 已闭环，清单与判据留档不再作为待办驱动），并新增 D32（本轮文档重构与 V1.0
冻结口径）。**D1–D31 正文一字未改**（留痕铁律：被取代的决策只加注、不删除），决策索引、风险清单、
技术债与未验证清单同步补 D32 一行。技术选型（Next.js 16.4.3 / Prisma 6.19.3 / Tailwind CSS 4.3.3）未改动。


---

## 零、架构总览（一页看懂）

> 本节是全项目**唯一的架构总览**：SPEC.md 与 README.md 只引用本节，不再各自复述一份架构。
> 文档体系按五层防线运转：事实基座（AGENTS.md）→ 规格锁定（SPEC.md，V1.0 冻结）→
> 决策记录（本文件）→ 验收门禁（四道门禁 + CI）→ 过程存证（docs/01、docs/02）。

- **形态**：单人档案库——Next.js App Router 全栈单体，无注册、无 UGC，不设独立 API 层（仅 `/api/health` 与 NextAuth 端点）。
- **技术栈分层（版本为实测值，锁定项，改动需单独立项批准）**：
  表现层 Next.js 16.4.3（App Router + RSC + `cacheComponents`/PPR）· 样式 Tailwind CSS 4.3.3
  （`@tailwindcss/turbopack`，无其他 UI 库/图标库）· 会话与准入 next-auth 4.24.15（Credentials，仅 `/admin`）·
  数据访问 Prisma 6.19.3 · 存储 PostgreSQL 16（Docker，库名 laity）· 图片对象 阿里云 OSS（ali-oss 6.23.0）·
  边缘 nginx（TLS / 安全头 / 登录限流 / XFF 覆写）· 工具链 TypeScript 5.9.3 + npm（禁 pnpm/yarn/bun）。
- **分层与数据流**：
  - 访客界面（RSC 直读库，PPR：静态壳 + 请求期数据）：`src/app/**` 页面路由 → `src/lib/**`（唯一数据访问层）→ Prisma Client → PostgreSQL 16。
  - 后台（口令登录）：`src/app/admin/**` → Server Actions（`requireAdminSession()` 统一准入门）→ 同一 `src/lib` 层。
  - 生产边缘：nginx（TLS / 安全头 / 登录限流 / XFF 覆写）→ `app`（standalone 容器）→ `db`（容器）。
- **三条关键链路**：
  1. 发布：表单 → `parseInput` → `saveLog`（写库）→ `publishLog`（按库中正文算 SHA-256 + 记服务器时间）→ `redirect(?published=1)`。
  2. 读日志：页面 → `getSafeLogs` / `getSafeLogBySlug`（强制 `isPublished: true`）→ 详情页印章。
  3. 上传：`Editor` → `uploadImage`（收 Blob）→ `object-key` 生成键 + `image-signature` 判类型 → OSS → 外链回填。
- **唯一真相点（改这里就改全局，别处不得重算/重定义）**：
  `content-hash.ts`（摘要口径）、`site.ts`（站点标识）、`routes.ts`（路由归属）、`error-text.ts`（错误文案）、`forms.ts`（表单规则与限额）、`time.ts`（时间格式化）。
- **信任边界**：库口令、`NEXTAUTH_SECRET`、`ADMIN_PASSWORD`、OSS AK 四类只进 `.env`；生产走 `${VAR:?}` + preflight 硬卡，不进仓库、不进产物。

## 零·补、历史决策裁剪说明（读 ADR 前先看这一节）

本文件按"留痕优先"运作：**被取代的决策正文一律保留、不删除、不重写**（见「记录模板」末段规则）。
这带来一个真实风险——旧口径读起来像还有效。本节给出裁剪地图：按现行实现写作时，
以下条目**只读取代者，不读原文**。

### 一：GitHub OAuth 已被管理员口令取代（D2 → D20）

- **D2（2026-10-30）** 原决策：NextAuth GitHub Provider + 服务端白名单 `ALLOWED_GITHUB_IDS`，
  在 `signIn` 回调里比对不可变的 GitHub 账号 ID。D2 当时否掉 Credentials 的理由是
  "自己管哈希与防爆破，纯增风险"。
- **D20（2026-11-04，负责人点名"先取消 github 登录"）取代 D2**：提供方改为框架内置的
  `providers/credentials`（id 固定 `admin`），准入只认环境变量 `ADMIN_PASSWORD` 一把口令，
  比对方式为两侧各取 SHA-256 后 `timingSafeEqual`；会话载荷由 `githubId` 换成布尔位 `isAdmin`。
  这是在**明确的现实阻塞下重新选择**被否过的方案（OAuth 凭据修不好，`/admin` 写路径一条都验不了），
  换来的是零新依赖、不建表、不动 D5 摘要口径。
- **随之退出的东西，见到就别加回**：`GITHUB_ID` / `GITHUB_SECRET` / `ALLOWED_GITHUB_IDS` 三个环境变量
  （CI 里的占位变量已在 `d7959bf` 删除）；OAuth App 创建这一前置动作；`AccessDenied` 错误码文案；
  Phase 3 验收标准 1–3 的 GitHub 语义；D11 里"两跳到 GitHub 授权页"的表述。
  preflight 第 7 项判定已由"白名单非空"改为"口令非空且 ≥12 位"（D12 修订）。
- **仍然成立的部分**：NextAuth v4 + JWT 会话骨架（D8）、`/admin` 由 `src/proxy.ts` 前置守卫、
  三处会话判定共用 `requireAdminSession()`（D21）、登录页自建在 `/login`（D11）。

### 二：V2.0 多用户形态被明确搁置（D19，负责人 2026-11-04/05 复核）

- **裁决**：保持单人档案库定位不变。外部《Laity 多用户开发者档案库 合规需求设计方案》
  （存 `docs/archive/`）里的邮箱注册、手机号验证码、User 表与租户隔离、GitHub Token 加密入库、
  UGC 避风港与侵权投诉、内容审核与举报、管理员分角色与审计日志、数据导出与注销、
  Freemium 付费与自定义域名——**约六成条目的前提在本站根本不存在**，V1.0 一律不实现，
  也不在任何对外文案里承诺。判据是三条实测事实：`prisma/schema.prisma` 只有 `Project` / `Log`，
  全文无 `User` 与 `userId`；全仓只有一处 `db.project.delete`；库里不存邮箱、手机与 Token。
- **已吸收的与定位无关项**（这才是那份方案对单人站真正的价值）：内容摘要的中性措辞、
  发布前敏感信息扫描门（`LOG_003`）、作者删除权（`LOG_004` 回填 slug）、`/licenses` 开源致谢、
  页脚三项合规位未配置即不渲染、凭据泄露应急预案。逐条对照见
  `docs/00-开发方法论/合规需求差距分析与分期方案.md`。
- **转多用户的代价（写清以免日后低估）**：至少 4 个新依赖 + 3 个付费外部服务 + 全表加 `userId`
  + AGENTS/SPEC/DESIGN 重写 + **已登记多轮的软著材料作废**。若将来真要启动，走 Phase 9 单独立项，
  依赖与服务逐项报批，不在任何既有 Phase 里"顺便"实现。

### 三：其它已失效的外部草稿设定

历史草稿（`docs/archive/deprecated-drafts/` 两份 docx 与原型 HTML）里符合单人形态但当时遗漏的需求，
已在 2026-11-05 整合进 SPEC 第二节并标「草稿整合」；与之冲突或未采纳的设定（Next.js 14 初始化、
`SiteConfig` 模型、`onDelete: Cascade`、首页固定档案条目展开卡、联系区本地演示表单、页脚演示声明、
Conventional commit 前缀等）逐条登记在 SPEC 第八节 C1–C10，一律不作为实现依据。

## 一、架构决策记录

凡 AGENTS.md / SPEC.md 已锁定事项（技术栈、视觉、OAuth、部署目标）不在此重新决策，只记录剩余自由度上的选择。

### 记录模板（新增 D 时照此写）

```
### D##：<一句话决策名>
- 背景：<触发这件事的现实问题，尽量带判据/现象，不写"感觉" >
- 决策：<选了什么，写明被否的备选 >
- 理由：<为什么这样选 >
- 代价与边界：<如实标注没解决的、可能要还的债 >
- 判据：<本机实测结果；未实测的写清缺哪一步 >
- 连带：<同步改了哪些文件与文档 >
```

编号一经分配不再复用；被后续决策取代时，在旧条加一行"已被 D## 取代"、并在索引表标注，不删除旧文（留痕优先）。

### D1：写操作走 Server Actions，不另建 REST API 层
- 决策：全部写操作（存草稿/发布/项目管理/上传）用 Server Actions。
- 理由：单体单人项目，Server Actions 省掉 API 路由、鉴权中间件重复接线和前后端两套类型；被否备选是 REST Route Handlers——多一层契约维护，收益只有"未来可能开放 API"，属于 hypothetical。
- 代价：未来若真要开放公开 API 需补一层；接受。

### D2：鉴权用 NextAuth GitHub Provider + 服务端白名单
- 决策：signIn 回调里校验 GitHub 账号 ID 是否在环境变量白名单（ALLOWED_GITHUB_IDS）内，不在即拒绝；/admin 全路由由 proxy 保护（Next 16 已将 middleware 更名 Proxy，见 D7）。
- 理由：不存密码、不做注册找回；白名单用不可变的账号 ID 而非用户名（用户名可改）；被否备选 Credentials——自己管哈希与防爆破，纯增风险。
- 代价：依赖 GitHub 可用性；GitHub 挂了我也进不了后台，但访客不受影响，接受。
- **已被 D20 取代（2026-11-04）**：GitHub Provider 与 `ALLOWED_GITHUB_IDS` 白名单退出，准入改为一把 `ADMIN_PASSWORD` 口令；`/admin` 仍由 proxy 保护，三层会话判定点不变。

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
- 修订（2026-11-04，随 D20）：最后一条判定由"`ALLOWED_GITHUB_IDS` 非空"换成"`ADMIN_PASSWORD` 非空且不短于 12 位"，通过行加印后台口令长度（仍只印长度）。

### D13：首页看板与精选改走专用取数口，精选规则先不依赖数据库字段
- 背景：SPEC F01 要"精选项目"、SPEC:102 要首页用项目表，而实现是拿 `getSafeLogs` 的结果反推，零日志项目根本不上榜（I029）。
- 决定：`src/lib/projects.ts` 新增 `getArchiveBoard()`（内部强制只统计已发布日志，返回 count 与可空的 latest），
  首页看板与精选都从它取数；精选规则定为「有已发布日志的项目按最近发布时间取前三」。
- 为什么这样选：手工置顶需要给 Project 加字段并出迁移，成本与风险都更高；先用无字段规则把 F01 补上，
  要改成人工挑选再单独走数据库变更。零日志项目 `latest` 用 `null` 表达、界面显示"尚未发布"，
  不拿创建时间冒充更新时间。
- 影响：`src/app/page.tsx`、`src/components/StatusBoard.tsx` 行为变化，前台隔离铁律不变（封装内强制 `isPublished: true`）。

### D14：下架动作独立存在，SPEC 的错误返回描述按实现改写
- 背景：SPEC:117 定义了 `unpublishLog` 但代码里从未实现（I028）；SPEC:122 又写"统一 `{ok,code,message}`"与实际不符（I031）。
- 决定：补 `unpublishLog(id)`——`updateMany` 一次完成存在性判定与状态翻转，历史 `contentHash`/`publishedAt` 保留不清空，
  与 D9 的留痕规则一致；SPEC 的契约描述改为如实区分两种形态：页面表单动作 redirect 带 URL 参数
  （`?saved / ?published / ?unpublished / ?error=CODE`，可截图留证），编辑器内 `uploadImage` 返回对象；
  两者都不带 message，文案单源在 `src/lib/error-text.ts`。
- 为什么这样选：URL 参数留证是 Phase 4 已验收的口径，改代码去追 SPEC 那句话会推翻既有验收证据；
  而 SPEC 那一行只是描述，改描述零风险。
- 影响：`SPEC.md` Server Actions 一节；`src/lib/publish.ts`、`src/app/admin/log-actions.ts`、编辑页新增表单。

### D15：为 seed 与运行时共用哈希口径，开 `allowImportingTsExtensions`
- 背景：D5 的 SHA-256 口径在 `src/lib/content-hash.ts` 与 `prisma/seed.ts` 各有一份（I027），改一处忘另一处会让种子数据印章与复核值背离。
- 决定：`tsconfig.json` 加 `allowImportingTsExtensions: true`（`noEmit` 本就为 true，满足该选项前置），seed 用 `.ts` 后缀导入共享模块。
- 实测：`npx prisma db seed` 在本地真库跑通，证明 Node 运行时能吃这种导入，此前只卡在类型检查。
- 边界：这是编译器配置变更（AGENTS.md 红线内），经我批准，只加这一个键，其它配置不动。

### D16：补一层"产品骨架"——持久导航、元信息、抓取规则与可达性
- 背景：六个 Phase 把功能做齐了，但站点骨架是缺的：前台没有持久导航（`/projects` 只能手输 URL，即 I030 的根因）、
  全站只有一行 title/description、没有 `robots.txt` 与 `sitemap.xml`、详情页标题不跟随内容、键盘焦点无可见样式。
  这些不在任何 Phase 的验收清单里，所以没人做也没人发现——**功能完备不等于产品合格**。
- 决定：新增 `src/components/SiteNav.tsx`（根布局挂载，`/admin` 与 `/login` 自行不渲染，当前页用 `aria-current`）、
  `src/lib/site.ts`（站点标识与 URL 单源，复用 `NEXTAUTH_URL` 不新增环境变量）、
  `src/lib/sitemap-data.ts` + `src/app/{sitemap,robots}.ts`；五个前台页补 `id="main"` 承接"跳到正文"；
  `globals.css` 加 `:focus-visible` 主墨色 2px 实线（守零圆角与无阴影）；详情页改 `generateMetadata`，
  描述优先取"经验总结"字段（它本身就是这条复盘的结论）。
- 为什么这样选：导航做成客户端组件按路径自判，而不是给五个页面各插一遍——重复五遍的东西一定会漏改一处；
  也不用 route group 包一层布局，那要移动路由文件、违背 AGENTS.md 的目录约定。
  站点 URL 复用 `NEXTAUTH_URL`：再加一个 `SITE_URL` 就多一处"改了 A 忘了 B"的漂移点，而两者本就必须是同一个对外地址。
- 同时收掉两条产品正确性缺陷：上传类型判定改读文件内容签名（I032，`file.type` 可伪造且真 PNG 被误报时会错拒）、
  已发布但缺摘要时前台显式提示"存证缺失"而不是安静地不画印章（存证是本站唯一的差异化卖点，静默降级最伤信任）。
- 影响文件：`src/app/layout.tsx`、五个前台页、`src/components/SiteNav.tsx`、`src/lib/{site,sitemap-data,logs,projects}.ts`、
  `src/app/{sitemap,robots}.ts`、`src/app/globals.css`、`src/lib/oss.ts`、`deploy/nginx.conf`。
  视觉铁律未动：零圆角、无阴影、无渐变、无图标库、色值只用既有四色。

### D17：上线基线——测试、健康探针、错误页与合规页
- 背景：功能与产品骨架齐了以后，缺的是"敢不敢放上去"的那一层：没有任何自动化测试、没有与登录无关的健康端点、
  未知路由落框架默认页、没有隐私说明与备案号位置。
- 决定与取舍：
  1. **测试用 Node 自带的 `node --test`，零新依赖**（AGENTS.md 禁止未批依赖）。`npm test` = `node --test "tests/*.test.ts"`
     （glob 必须自己写引号交给 Node，`node --test tests/` 这种目录写法在 Node 24 会把参数当模块去 require 而报 MODULE_NOT_FOUND）。
     只测纯逻辑：D5 口径、图片内容签名、slug 与表单工具、错误码文案、时间展示、路由归属。DB 层与需登录的动作层不覆盖——
     伪造会话去凑覆盖率已经被 I017 拦过一次，不为凑数冒险。
  2. **健康端点 `/api/health` 必须请求期执行**：Cache Components 下不加 `await connection()` 会被预渲染，
     返回一个永远不会变的"ok"，那就成了一个会说谎的探针。实测拔库→503、恢复→200。
  3. **路由归属拆成 `src/lib/routes.ts`**：站点模块 `src/lib/site.ts` 读 `process.env`，被客户端组件 import 会把环境变量打进浏览器包，
     所以判定逻辑单独成一个无 env 依赖的纯模块给 SiteNav/SiteFooter 共用。拆开后测试立刻抓出原来的裸 `startsWith`
     会把 `/administrative` 误判成后台——改成按路径段边界匹配并先剥查询串。
  4. **图片签名判定拆成 `src/lib/image-signature.ts`**：纯计算，拆开后测试不必把 ali-oss SDK 拉进测试进程，`oss.ts` 也回到只管凭据、上限与写入。
  5. **ICP 备案号走 `SITE_ICP` 环境变量**，未配置时页脚整行不渲染——不硬凑"备案号待补"这种上不了台面的占位文案；
     值由服务端读、以 prop 下传给客户端页脚，同样是为了不把 `process.env` 带进浏览器包。
  6. **`error.tsx` 有意不接收 `error` prop**：异常文本可能带内部路径与参数，既不上页面也不落控制台，只留一个「重试」。
- 影响文件：`tests/*`（6 个文件 30 条断言）、`src/lib/{routes,image-signature,site,sitemap-data}.ts`、`src/lib/oss.ts`、
  `src/components/{SiteNav,SiteFooter}.tsx`、`src/app/{layout,error,not-found,robots,sitemap}.{tsx,ts}`、
  `src/app/privacy/page.tsx`、`src/app/api/health/route.ts`、`package.json`（只加 `test` 脚本）、两个 `.env` 模板（加 `SITE_ICP`）。
- 有意不做：CI 流水线（AGENTS.md 把 CI 配置划为红线，需单独立项批准）；把 `/api/health` 换进 compose 的 healthcheck（编排变更，同样待批）。

### D7：/logs/:slug 与 /projects/:slug 的真 404 由 Proxy 前置判定
- 决策：src/proxy.ts 的 matcher 为 `["/logs/:slug", "/projects/:slug", "/admin/:path*"]`；日志按"是否已发布"判定，项目按"slug 是否存在"判定（`select slug` 落在唯一索引上），未命中直接返回带 404 状态码的极简纸白页（noindex + no-store），文案按路由类型分别给出、请求里的 slug 一律不拼进 HTML。
- 理由：本项目开了 Cache Components（pPR），流式响应固定以 200 开头，页面级 notFound() 只能在正文已流式之后才执行，实测未发布日志与不存在项目都返回 200 + 错误页。Next 官方文档对动态路由真 404 的处方就是 Proxy 前置检查；rewrite 携带 status 实测同样被渲染路由的 200 覆盖，只有直接返回 Response 才保留状态码（两种写法都已实测）。
- 代价：每次详情类访问多一次 `select` 查询；Proxy 内不得依赖共享模块与全局状态；数据库不可用时该路由返回 500 而非 404（诚实失败，不做兜底）；接受。
- 连带：Phase 3 的鉴权文件由 src/middleware.ts 改为 src/proxy.ts，与本节同一文件扩展。Phase 5a 的 `/projects/:slug` 由我在 2026-10-30 批准扩入（I015），同时把该文件写进 5a 清单。

### D8：Phase 3 先用 JWT 会话，数据库会话留作后续可拓展项
- 决策：NextAuth v4 默认 JWT 会话，不建 Session/Account/User 表；会话里只放 `githubId` 与展示名，授权判定唯一依据仍是 `ALLOWED_GITHUB_IDS`。
- 修订（2026-11-04，随 D20）：会话载荷由 `githubId` 换成布尔位 `isAdmin`，准入依据换成 `ADMIN_PASSWORD`；"不建表、用 JWT、Proxy 每请求重判"这三条骨架不变。
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

### D18：把"门禁记得跑"和"材料看得全"都交给机器判
- 决策一（CI，I037）：新增 `.github/workflows/ci.yml`，顺序与人工门禁一致 `npm ci → prisma generate → lint → tsc → test → prisma migrate deploy → build`，再加两步材料自检：`node tools/软著材料生成.mjs`（收录完整性 + 窗口适配）与 `git diff --exit-code -- docs/04-软著材料`（成品必须与重新生成结果逐字节一致）。
- 理由：这四条此前全靠我本机手敲，"忘了跑"就是发版；而 I018 那类"Windows 安装把 linux 平台条目从锁文件里删掉"的问题，只有 `npm ci` 跑在 linux 上才第一次变成常驻防线。材料两步是本轮踩出来的——第九轮我"按分段感觉"判断收录装得下窗口，实际把 `proxy.ts` 折走了 130 行；这种事人不可能每轮重算，但机器一行代码就能判。
- 决策二（给 CI 配一个真库服务，而不是赌"构建期不查库"）：本机想实测"把库停掉还能不能构建"时，安全策略连拦三次（停共享容器 / 打印带口令的连接串），我没有绕。既然结论没拿到，就让 CI 两种情况都成立：一次性 `postgres:16` + `prisma migrate deploy`，顺带证明那条 init 迁移能在全新的 16 上从零应用。工作流里的 env 全是显眼的占位值，不含任何真实凭据。
- 决策三（健康判据，I036）：app 探针从 `/login`（只证明进程活着）换成 `/api/health` 并解析响应体、要求 `db === true` 才退出 0；`web` 改为等 `app` healthy 再起。代价是库抖动会把 app 标成 unhealthy——可接受，因为 compose 不因 unhealthy 自动重启，`depends_on` 也只在启动时把关、运行期不追溯，不会级联停摆，只是把半死状态如实显示出来。探针表达式另用桩服务器做了五路自检（真健康退 0，503/返回 HTML/字段缺省/端口无人各退 1）：一个恒返回 0 的探针比没有更坏。入口网关不加探针——80 端口直接 301，busybox wget 对重定向判定不稳，与其装一个会误报健康的探针，不如没有。
- 决策四（收录清单改成数据结构）：`ORDER` 改为 `BANDS`（①②④ 必须整份可见，③ 标 `foldable`），`assertWindowFit()` 按**整页**折算窗口容量。关键算术：后窗口取的是最后 30 个页块，末页只有 9 行也占掉一个名额，所以真实容量是 1459 行而不是 1500 行——按 1500 估会让 `globals.css` 的分隔行与前 13 行正好掉在被切掉的半页里。违规即拒绝生成，并打印行跨度与处置建议。本轮为此让出容量的是 `src/lib/time.ts`（时刻格式化）与 `src/components/Seal.tsx`（印章只是排版，存证真逻辑在 `publish.ts` 与详情页调用处）。
- 已确认：Actions 首跑于 2026-11-04 通过——run 41752295295（提交 d8ced9c）completed/success，14 步全绿，
  含新增的"生成路由类型"、"在全新库上应用迁移"与材料两步自检；本机容器预演修掉的那两处，真跑确实不再红。
- 未验证：生产编排的健康判据变更只做了 `docker compose config` 渲染核对，整套启动仍需服务器上实跑。
- 连带：`docs/03-截图/` 改名 `docs/03-功能截图/` 与 AGENTS.md、README 对齐（原打算 `git mv`，实际目录为空且从未入库，Git 不跟踪空目录）；`eslint.config.mjs` 的 ignores 加 `tmp/**`（I039），一次性诊断脚本不参与 lint。

### D19：外部合规方案进来后，先裁决定位，再逐条吸收
- 背景：收到一份《Laity 多用户开发者档案库 合规需求设计方案》（v1.0），要求"据此重构代码和方案"。它假设的产品是多用户平台（邮箱注册、手机号验证码、GitHub Token 加密入库、租户隔离、UGC 避风港、内容审核、Pro 付费）。
- 决策一（定位不变）：**保持单人档案库，只吸收与定位无关的合规项**。判据是三条实测事实：`prisma/schema.prisma` 只有 `Project`/`Log`，全文没有 `User` 与 `userId`；全仓只有一处 `db.project.delete`，日志连删除能力都没有；`src/auth.ts` 只往 JWT 写 `githubId`，库里不存邮箱、手机与 Token。转多用户意味着至少 4 个新依赖 + 3 个付费外部服务 + 全表加 `userId` + AGENTS/SPEC/DESIGN 重写 + **已登记十轮的软著材料作废**，而方案里约六成条目的前提在本站根本不存在。多用户留作 Phase 9 备选，不在本轮展开。
- 决策二（措辞按受众分界）：方案 3.3.2 要求"哈希只作技术标记，不做存证/防伪宣传"。**对外访客可见的文案中性化**——站点描述、默认标题、印章标题（"存证印章"→"内容摘要"）、摘要缺失告警（"存证缺失"→"摘要缺失"，并明确"无法核对是否被改动"）；**对内保留原叙事**——代码注释、SPEC/DESIGN、软著材料仍写"证据链/存证"，因为那是研发留痕与登记口径，不是对公众的服务承诺。技术语义（D5 口径）一字未动，改的只是宣传口径。
- 决策三（删除权与留痕的取舍）：加 `deleteLog` 彻底删除，但要求原样回填该条 slug 作为确认（`LOG_004`），而不是靠一个弹窗按钮；与 D9"下架保留历史摘要"并存，两条路径语义各自清楚。**图片对象不随删除走**：那把 RAM 密钥只有 `PutObject`，为了"删内容即删对象"去扩 `DeleteObject` 是安全性的净损失，改用存储桶生命周期规则兜底。
- 决策四（把方案里的红线变成可执行断言）：新增 `/licenses` 与 `src/lib/licenses.ts`，18 个直接依赖的许可值逐个从 `node_modules/<包>/package.json` 实测读出后登记；`tests/licenses.test.ts` 做三件事——每个依赖必须在清单里（漏登记即红）、清单里不能有已删除的依赖（漂移即红）、许可不得命中 `GPL/AGPL/LGPL/CC-BY-NC/SSPL` 前缀。AGENTS.md 的"传染性许可禁止"从此不再是口头约定。
- 决策五（发布前敏感信息门）：`src/lib/sensitive-scan.ts` 纯函数 + `LOG_003` 确认门。这是外部方案里对单人站**最有价值**的一条：日志正文若贴过 AccessKey 或口令，正是 AGENTS.md 凭据红线要防的事故。设计要点两条——① 规则分两种作用域，数字形态类（手机号/身份证/IP/AK）逐词元匹配并整体跳过长度 ≥16 的十六进制摘要，否则 64 位 contentHash 里的数字串会被当成手机号；跨标点的形态（`password=xxx`、私钥块、JWT）必须全文匹配，按词元切会永远命不中。② 邮箱归提示级不拦发布，因为联系方式常常是故意公开的，拿它拦只会逼人关掉整个功能。扫描对象是**库里将要公开的正文**，不是表单声称的值。
- 顺带抓到一个上线级漏项：`SITE_ICP` 从未出现在 `docker-compose.prod.yml` 的 `app.environment` 里——compose 的 `--env-file` 只参与变量插值、不会注入容器，所以备案号填进 `.env.production` 也永远不显示。补 `SITE_ICP` / `SITE_POLICE_ICP` / `SITE_CONTACT_EMAIL` 三行，用 `${VAR:-}` 而非 `${VAR:?}`：未备案、没有公开邮箱时留空是合法状态，硬卡会把整个 `up` 拦死。判据：`docker compose config` 在缺这两个新键时仍渲染出空值且退出 0。
- 未复核项（如实标注）：三款字体的许可证按 AGENTS.md 的字体白名单登记（SIL OFL / Apache 2.0），本轮两次联网取上游 LICENSE 均失败（`fonts.google.com` 与 raw.githubusercontent 都取不到），Next 自带的 `font-data.json` 也没有 license 字段，故 `/licenses` 页明写"本次未联网复核上游 LICENSE 原文，若与上游不一致以字体仓库声明为准"，并挂 I040 待复核。
- 明确不做（避免半成品）：邮箱注册与密码找回（要 SMTP + bcrypt，新依赖需批准）、手机号验证码（阿里云短信资质与费用）、图形验证码、内容安全 API（付费）、Webhook 同步与 Token 加密存储（前提不存在）、管理员分角色与审计日志、数据导出、注销流程。逐条对照与分期写在 `docs/00-开发方法论/合规需求差距分析与分期方案.md`。
- 一处对来源方案的纠正：它把"仅申请 `public_repo` 和 `read:user`"当作最小权限——`public_repo` 是**可写** scope，而只读公开仓库元数据不需要任何 repo scope。本站现状未声明 scopes，走 NextAuth 默认的 `read:user user:email`（已在浏览器授权 URL 实测到），本身已比方案要求更小。照抄反而扩大权限。

### D20：取消 GitHub 登录，后台准入改为一把管理员口令
- 背景：我点名"先取消 github 登录"。直接起因是本地 `GITHUB_ID` 始终对不上 OAuth App（20 位且含大写，GitHub 的 client ID 全小写），而真实凭据只在服务器与我的账号里——凭据不修好，`/admin` 的写路径一条都验不了。
- 决策：NextAuth v4 与 JWT 会话**都不动**，只把提供方从 `providers/github` 换成内置的 `providers/credentials`（id 为 `admin`），口令读 `ADMIN_PASSWORD`；准入判定收敛到 `src/lib/admin-password.ts` 的 `passwordMatches()`——两侧各取 SHA-256 后用 `timingSafeEqual` 比较，口令未配置或输入为空一律拒绝。会话里原来写 `githubId`，现在只写一个布尔位 `isAdmin`，`src/proxy.ts` 判 `token?.isAdmin !== true`。
- 与 D2 的关系：D2 当年"被否备选 Credentials——自己管哈希与防爆破，纯增风险"。这次是**在明确的现实阻塞下重新选它**，代价换的是不引入任何新依赖（v4 自带该 provider）、不建 `User`/`Session` 表、不改 D5 摘要口径。哈希这一项也不再是"自己管"：库里不存口令，口令只在各环境的 `.env` 里，比较用摘要 + 常量时间。
- 连带改动（六处，缺一处就是不一致）：登录页文案与表单（`SignInButton.tsx` 由按钮改口令输入）；`error-text.ts` 删 `AccessDenied`、补 `CredentialsSignin`、`Configuration` 不再指 OAuth 回调；`.env.example` / `.env.production.example` 的三个 GitHub 键换成 `ADMIN_PASSWORD`；`docker-compose.prod.yml` 的 `app.environment` 与 preflight 门禁（原"白名单非空"→"口令非空且不短于 12 位"，通过行只报长度）；`README.md`/`SPEC.md` 的栈描述与 F04、`/api/auth/*` 行；软著材料与操作说明书的登录章节。
- 未做与已补（2026-11-04 同日按我点名"1044 可改，1045/1046 根据你的经验改"收口）：① 失败次数限制——**已落地**，`deploy/nginx.conf` 对登录端点单加 `limit_req`（`rate=5r/m` + `burst=5 nodelay`，超限由代理直接 429，请求不进应用）；应用侧仍没有计数器与锁定，这一层是外部约束而不是替代。② 退出与过期沿用 v4 默认（当时 30 天 JWT），没有服务端即时吊销——换 `NEXTAUTH_SECRET` 是唯一手段，已写进 `/privacy` 与应急预案；会话寿命同日按 D25 收到 12 小时。③ CI 里三枚 `GITHUB_*` 占位变量——**已删除**，且没有换成新的死占位（留一个没人读的变量正是那条台账要治的病）；实跑已确认——推送 `d7959bf` 后 run 41778791390 的 18 步全 success，含最后两步的材料完整性与"材料与说明书是否同步"。④ AGENTS.md 的登录行、环境实况与 preflight 清单三处过期事实已按授权改正，文件头留痕追加一行。
- 顺带修掉一处 dev 期的渲染缺陷：`/login` 在 Cache Components 下被预渲染，而 `getServerSession()` 走到 NextAuth 的 CSRF 生成（`core/lib/csrf-token.js:25` 的 `randomBytes(32)`）——无 csrf cookie 时才触发，与提供方无关，GitHub 时代同样存在，只是本轮第一次用浏览器停在 `/login` 才暴露。按框架自己的建议在读会话前加 `await connection()`，实测 `blocking-prerender-random` 由 602 条降到 0 条。
- 判据（本机实测，非推断）：正确口令 → 签发会话 cookie 且 `/admin` 返回 200 并渲染"管理员"；错误口令 → `401` + `/api/auth/error?error=CredentialsSignin`，不落 cookie；无会话访问 `/admin` → `307 → /login?callbackUrl=%2Fadmin`；浏览器真人路径登录后 `LOG_003`（未勾选拒发）与 `LOG_004`（错填 slug 拒删）各跑通拒/放两条分支，临时日志删除后概览回到 1 项目 / 1 已发布 / 0 草稿。

### D11：后台登录页自建，落点 /login 而不是 /admin/login
- 决策：`authOptions.pages = { signIn: "/login", error: "/login" }`，登录页与错误提示都在这一个页面里给；Proxy 与 admin 布局的未登录跳转都改成 `/login?callbackUrl=…`；`callbackUrl` 只接受本站相对路径（以 `/` 开头且不以 `//` 开头），否则回落 `/admin`。
- 理由：NextAuth v4 默认登录页自带主题样式（圆角、浅色卡片），与视觉铁律冲突，而且从 `/admin` 进去要多一次点击。放 `/admin/login` 会死循环——`pages.signIn` 一旦设置，`/api/auth/signin*` 的 GET 一律 307 到它，而该路径同时被 Proxy 的 `/admin/:path*` 与 admin 布局的会话守卫管辖，三者互相弹回；放到 `/login` 既不在 matcher 里也不吃 admin 布局。callbackUrl 两层兜底：我这层挡住协议相对与绝对外链，v4 的 `default-callbacks.js#redirect` 再挡一次非本站 origin。
- 代价：登录入口的 URL 与后台不同源命名（`/login` 而非 `/admin/login`）；多一个客户端组件（见 D3 的 CSRF 原因）；`/admin/:path*` 的守卫覆盖面因此少一条路径，但它本来就不该拦登录页。
- 连带：Phase 3 的"未登录访问 /admin → 跳转 GitHub 授权页"改为两跳语义——`/admin` → `/login` →（点一次按钮）→ GitHub 授权页；非白名单账号回到 `/login?error=AccessDenied` 并显示中文提示。

### D21：跑起来再改——可达性、提交反馈与三层判定统一
- 背景：我让助手"运行程序并按经验优化（页面美观、功能权限等方面），可以暂时突破限制"。它没有先动手改，而是把八条路由逐一量了一遍，改动都对着量出来的缺口，不对着"看起来还能更好"。
- 量到的事实（本机 dev + 应用内浏览器）：所有页面无横向溢出、`h1` 唯一、日志正文实测 18px / 行高 33.3px（=1.85）Noto Serif SC，标签 10–11px JetBrains Mono，最差前景色对比 6.45:1——**排版与视觉铁律本来就成立，硬改美观只会破坏它**；真正的缺口是四个：后台各页没有正文地标与跳转链接（前台有）、隐藏的文件输入没有任何可访问名称、七个写动作按钮在提交期间不禁用（连点会真重复写）、以及守卫层判 `isAdmin` 而动作层只判"会话存在"。
- 决策一（判定统一）：`src/auth.ts` 增加 `requireAdminSession()`，并在 `session` 回调里把令牌里的布尔位带到会话对象上——会话实测从 `{"user":{"name":"管理员"},"expires":…}` 变成多一个 `isAdmin: true`。三处判定（Proxy / 后台布局 / 各 Server Action）从此共用同一个入口，动作层不再接受"只要有会话就放行"。这不是为假想场景加防护：**今天两层判据不一致是事实**，而 `/api/auth/session` 的形状是唯一能核对的落点。
- 决策二（提交反馈）：新增 `SubmitButton`（`useFormStatus`，来自 `react-dom`——本轮先在 `node_modules` 里核实过 React 19.3 仍从 react-dom 导出，不是凭记忆）。七个写动作按钮共用；登录表单自己发 `signIn`，用局部 state 兜住"请求抛错但人还停在页面"的情形，`finally` 里恢复按钮。实测点一次新建项目：按钮立刻变"提交中…"、`disabled=true`、`aria-busy=true`，重渲染后新节点恢复可用；随后把这条临时项目删掉，列表回到只有"地球 Mirror"。
- 决策三（应用层节流）：`admin-password.ts` 加进程内窗口（10 分钟 / 5 次失败 / 按来源）。**为什么值得加**：`next dev` 默认监听 `0.0.0.0`（实测打印 Network 地址且 netstat 可见），登录端点在局域网里直接可达，而生产第一道限速在 nginx——应用被直接暴露时没有任何约束。行为与"口令错"完全一致：curl 连错 5 次后第 6 次**用正确口令**仍 401 且不发会话 cookie。写用例时发现额度会被记成负数，补了钳位——这是测试抓到实现错，不是反过来。
- 明确不做：不引入任何新依赖（`useFormStatus` 是既有的 react-dom）；不动视觉铁律的具体数值（10px 标签、零圆角、无阴影保持原样）；不碰 `next.config.ts` / CI / lockfile。若要把 10px 标签调大或引入组件库，需要单独点名——那属于突破"锁定"而不是"暂停"。
- 边界与代价（如实标注）：① 节流计数在进程内，多实例不共享，键取 `X-Forwarded-For` 首跳、无该头时落 `local`，因此直接暴露时可被伪造来源；② 我自己连错 5 次会被锁 10 分钟，dev 下重启进程即清（本轮实测后就是这么清的）；③ 新组件 `SubmitButton` 整份落进材料省略段——与后台交互层同一口径（第八轮起定的），不是漏登记，`assertComplete()` 核过。
- 连带：①+② 涨了 37 行把 `proxy.ts` 切出前窗口，让位的是 `tsconfig.json` 与 `eslint.config.mjs` 两枚纯工具样板；材料 5626 行 / 113 页 / 收录 64，窗口自检与幂等复跑通过，四道门禁 0/0/60 全绿/0。
- 待我确认：AGENTS.md 的"三处会话判定"一行仍写 `getServerSession`，现在这三处都走 `requireAdminSession`（记 I049）。

### D22：来源地址必须可信——边缘覆写 `X-Forwarded-For`，未配置口令在服务器侧留提示
- 背景：D21 的应用层节流按 `X-Forwarded-For` 的**首跳**计数，而反代原本是 `$proxy_add_x_forwarded_for`——这个写法在只有一层边缘代理的本站是错的：nginx 追加，客户端自己塞进来的假第一跳永远排在最前面，来源可以任意伪造，节流等于形同虚设。我点名"I050 可以改，根据你的经验改"。
- 决策一：`deploy/nginx.conf` 改为 `proxy_set_header X-Forwarded-For $remote_addr;`（**覆写**，不是追加）。本站没有需要保留的上游链路，追加买到的东西为零，代价是伪造面。
- 决策二：`ADMIN_PASSWORD` 未配置时，`authorize` 往**服务器日志**写一条不含口令值的提示（`[admin] ADMIN_PASSWORD 未配置：登录一律拒绝`）。判据不是安全而是可诊断性——没有这条，本机漏配的人只看到一个笼统 401，会先怀疑自己把口令抄错了，而这条线索恰好是本轮我自己踩到的。
- 判据（一次性容器实测，测完即拆）：客户端发 `X-Forwarded-For: 1.2.3.4, 5.6.7.8`，应用实际收到 `{"xff":"172.20.0.1","realip":"172.20.0.1","proto":"https"}`——伪造值没能穿过边缘；同一份配置 `nginx -t` 通过，四道门禁仍全 0（`npm test` 60/60）。
- 三条边界按"已接受"记录，不假装解决：① 计数在进程内，多实例不共享——当前 app 是单容器部署，"进程内"就等于"全局"，真要横向扩展才需要共享存储（那是新依赖，另批）；② 直连时该头不存在，来源统一落 `local`，同机共享一个窗口——dev 只有我一个使用者；③ 自己被锁十分钟的恢复手段只有重启进程或等窗口过期，**不加**"管理员解锁"入口，那等于在口令旁边再开一条门。

### D23：退出不再经过框架的英文确认页
- 背景：I012-B 当年把 NextAuth 的登录默认页换成自建 `/login`，理由是"默认页带圆角与浅色主题，与视觉铁律不符"。**同一个理由漏了退出**：后台右上角一直是 `<a href="/api/auth/signout">`，点下去落的是框架服务端渲染的确认页。读源码核实（`node_modules/next-auth/core/pages/signout.js`）：`<h1>Signout</h1>` + `<p>Are you sure you want to sign out?</p>` + `<button>Sign out</button>`，装在默认 `.card` 样式里——这是全站唯一的英文界面，也是唯一还留着框架样式的页面。
- 决策：新增 `src/components/SignOutButton.tsx`，用 `next-auth/react` 的 `signOut({ callbackUrl: "/", redirect: true })` 一步完成（它自己带 CSRF 发 POST），并沿用本轮的提交中禁用（"退出中…"）。不再提供二次确认。
- 为什么可以不要那句"你确定吗"：退出没有可丢的现场——草稿存在库里而不是表单里，退出后再登录仍在后台列表；而它的代价是整站唯一一处英文加一套不属于本站的样式。判断依据是行为的实际后果，不是"框架给了确认就该保留"。
- 边界（如实标注）：直接敲 `/api/auth/signout` 仍会渲染那张英文页——UI 里已没有任何入口通向它，本站没有对外承诺"所有 URL 都是中文"。要不要彻底禁掉记 I052。
- 验证与限制：`lint`/`tsc`/`build` 全 0，`npm test` 60/60；**真人点击那一步本轮未实测**——dev 服务上一轮为验节流被锁后需要重启，而重启命令要把哑口令写进命令行、被凭据护栏拦下（我没换写法绕）。缺陷本身有源码为证，交互回收需服务起来后点一次。

### D24：动效、丢稿保护，以及"授权突破限制"其实没被用到
- 背景：我第二次让助手"运行程序并按经验优化页面美观与功能权限，可以暂时突破相关 md 文件的限制"。它先把八条路由与全站结构量了一遍：横向溢出 0、`h1` 唯一、正文 18px/1.85 Noto Serif SC、标签最小 10px 对比 6.45:1、`/logs` 的项目与标签两个筛选维度互不丢弃（`logsHref` 同时带两个参数）、空状态在六处列表都有。**结论是"美观"这块没有可修的缺陷，硬改只会破坏既定语言**，所以这轮改的是三处"缺了才被发现"的东西。
- 决策一（120ms 换色过渡）：本站悬停是整块反色（墨底白字），零毫秒切换在纸白上像闪屏。`globals.css` 对 `a/button/input/textarea/select` 统一加 `color/background-color/border-color` 120ms 线性过渡，并用 `@media (prefers-reduced-motion: reduce)` 整体关掉——对前庭敏感的人这不是装饰而是负担。实测计算样式：三类元素都是 `0.12s`，且 `border-radius: 0px`、`box-shadow: none` 未变，CSSOM 里能查到那条媒体查询。**没有真的突破视觉铁律**：它禁的是圆角、阴影、渐变与图标库，没禁过渡；那句"可以暂时突破限制"我用不上。
- 决策二（丢稿保护）：`Editor.tsx` 在两份正文偏离初始值时挂 `beforeunload`，任一表单提交（保存/发布/下架/删除）先清标记，避免"刚点保存就被浏览器问要不要离开"。dirty 走 ref 同步、监听只挂一次。**三段行为在真页面上实测**：不改内容时派发 `beforeunload` 不拦；给 BEFORE 追加一个字（走原生 input 事件让 React 收到）就拦；再派发任意一次表单 submit 又不拦——全程用 `preventDefault` 挡掉真实提交，没有写出任何草稿。剩下的只是浏览器那个原生对话框的外观，脚本逼不出来，留给真人。
- 决策三（关掉最后一张框架页）：`pages` 补 `signOut: "/login"`，于是直接访问 `/api/auth/signout` 也 302 回登录页。实测跟随重定向后正文只剩"后台登录 / 管理员口令"，`Signout` 与 `Are you sure you want to sign out?` 均不再出现——I052 当场结案，不必等下轮。D23 留下的那句"UI 之外仍可访问"由这条补齐。
- 顺带修文档陈旧：说明书 5.4 写"页面提供两个动作按钮"，实际已是保存/发布/下架/彻底删除四个，一并改正。
- 运行时事实与真人补测：本机 `.env` 起初没有口令，配置体检第一次在真实进程里打出 `[admin] 配置体检：ADMIN_PASSWORD 未配置，登录一律拒绝（本条不含任何值）`；我把口令加上并重启后（派生核对：口令长度 12、密钥长度 44，均未复述值），我本人在应用内浏览器登录一次，把需要会话的三条补完——
  ① 点"退出"：落到 `/`，`/api/auth/session` 变回 `{}`（不是只有跳转，会话真清了），`/admin` 恢复 307、登出端点恢复 302；"退出中…"这一禁用态在 120ms 采样时已经看不见（跳转比渲染快），**这条视觉态仍未证**，只是不影响功能。
  ② 后台键盘动线：文档序第一个可聚焦元素就是 `a[href="#main"]`（文案"跳到正文"），目标 `#main` 是 `MAIN` 标签，19 个可聚焦元素；CSSOM 里 `:focus-visible` 只有一条规则（2px 实线 + 2px offset），没有组件自定的第二套焦点样式。
  ③ 程序化 `focus()` 量到的轮廓是 `none`——那不是缺陷，是 `:focus-visible` 本就不该响应脚本聚焦；这条我一开始读错了，改核 CSSOM 与键盘序才算数。

### D25：发布＝先存再发——所见必须等于所发；会话寿命收到 12 小时
- 背景：我第三次让助手"运行程序并按经验优化（页面美观、功能权限等方面），过程中可以暂时突破相关 md 文件的限制，需要登录口令时通知我"。口令由我本人配在 `.env` 里、我自己在浏览器里输一次，助手没有索取过任何值。这轮把后台写路径逐条走下来，量到的不是美观问题，而是一条**数据正确性缺陷**。
- 缺陷：编辑页原先是两张表单——保存表单带全部字段，发布表单只带一个 `id`。于是"改了正文、没点保存、直接点发布"会把**库里的旧正文**发布出去并盖上摘要，而按钮旁边的文案写的是"按当前正文算 SHA-256 并记服务器时间"：前台拿到的是新摘要配旧内容，人眼看不出不对。挂 I053。
- 决策一（所见即所发）：发布按钮改挂在保存表单上，靠 per-button `formAction` 指向 `publishLogAction`（`SubmitButton` 透传该属性，不必为它再开一张表单）；动作内部顺序改为 会话 → `parseInput` → `saveLog()` → `publishLog(saved.id)`，保存不通过就直接带错误码返回且不发布。发布前核对面板与确认勾选框一并移进同一张表单、排在按钮之前——原先它们在另一张表单里，勾选值根本提交不到发布动作。按钮文案改成「保存并发布」，把"这一步会先写库"写在脸上，说明行同步改成"发布 = 先保存这张表单里的内容，再按它算 SHA-256 并记服务器时间"。
- 判据（本机 dev + 应用内浏览器实测，非推断）：
  ① 正向：草稿正文写 A（`A 句：初稿正文 alpha-111`）→ 界面改成 B（`B 句：改过没保存的正文 bravo-222`）→ **一次保存都不点**，直接点「保存并发布」→ `?published=1`；前台 200、含 B 不含 A；页面摘要 `01b4456458626eb9…35fcdb03`，用唯一实现 `computeContentHash()` 独立按 B 重算得同一串，按 A 重算是 `3b7ad680…`（不一致）——盖上的是新正文的摘要，这是本轮真正的验收点。
  ② 敏感门不受影响：正文含阻截形态且不勾选 → `?error=LOG_003`，概览仍是 DRAFT；勾选后 → `?published=1`、前台可见。
  ③ 校验先于写：清空标题再点「保存并发布」→ `?error=VAL_001`，库里一个字段都没动。同一次采样的在途帧里还抓到 `保存中…|disabled` 与 `发布中…|disabled` **同时**出现（见边界②）。
- 决策二（会话寿命）：`session.maxAge` 从 v4 默认的 30 天显式改为 12 小时。理由：后台只有一把口令、JWT 会话没有服务端吊销（D20 未做项②），笔记本被人拿到就等于白送一个月的管理员权限；这里唯一动得了的旋钮就是有效期。实测 `/api/auth/session` 的 `expires` 与签发时刻相差 43200 秒。**不加"记住我"**——那等于把 30 天请回来。
- 边界与代价（如实标注，不假装解决）：
  ① 先存再发意味着**发布被拦时正文也已经保存**（②的实测分支就是这样）。接受它：草稿只对我自己可见，"保存"本身是无害动作，而它的反面"发布出去的是旧内容"是不可察觉的错。
  ② `useFormStatus` 的 pending 是**整张表单**共用的，同表单两按钮在请求在途期间一起变灰、各自换成"保存中…"/"发布中…"（上面③抓到的那一帧就是证据）。变灰共用是要的（不允许并发写），文案重复只是噪音。不做按按钮归因：React 把服务端动作写进 DOM 的 `formaction` 属性时，实测属性值是 `javascript:throw new Error('A React form was unexpectedly submitted…')` 这句守卫，不是动作本身；`status.action` 取的是提交按钮 props 里的函数引用，而它跨 RSC 边界是否仍与传进来的那个引用同一，我没法证——拿不可证的等式做交互判据，最坏结果是按钮再也不显示待命文案。想清楚代价后退回共享 pending。
  ③ 12 小时是"被拿走的笔记本最终会过期"，不是吊销：`NEXTAUTH_SECRET` 泄露时唯一的即时手段仍是换密钥（应急预案与 `/privacy` 已写明，本轮把有效期数字补进这两处）。
- 门禁：`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` 60/60、`npm run build` 0。实测产生的两条临时日志（`publish-flow-selftest-tmp`、`pending-label-selftest-tmp`）都用后台的彻底删除清掉，概览回到 1 项目 / 1 已发布 / 0 草稿，前台两条 slug 均 404。
- 连带：SPEC 的 F06 与动作契约表（`publishLog` 行的入参与错误码）、`/privacy` 与应急预案里的会话寿命、说明书 5.4/5.6 与 5.1、DESIGN D20 ② 的"30 天"表述，以及软著材料重出。

### D26：后台写路径的正确性收口——被拒的提交不许吃掉正在写的字
- 背景：我第四次让助手"运行程序并按经验优化（页面美观、功能权限等方面），可以暂时突破相关 md 文件的限制，需要口令时通知我"。口令这轮没用到——上一轮我登录签发的会话还在（`/api/auth/session` 的 `expires` 是 12 小时后），助手没有索取任何值。这轮量的是**后台写路径的语义**，外观上一轮已实测无可修缺陷。范围按我点名的"只修正确性"，外观与无障碍项一律记账不动手。
- 量到的六条（都可复现，判据见 Phase-7 自测表第十六节）：① 被服务端拒掉的保存会把整页打字内容销毁；② `VAL_001` 一个码覆盖 9 条规则、不说是哪条；③ 项目保存/删除跳回裸列表页（无成功回显）、删除还是一击生效；④ `/login` 的 `Configuration` 文案念出 `NEXTAUTH_SECRET`/`NEXTAUTH_URL` 两个键名，而这张页面对外可访问；⑤ `safeCallbackUrl` 挡了 `//host` 没挡 `/\host`；⑥ 表单里的原始 id 直接拼进 redirect、`projectId` 不校验存在性、项目行被人先删掉时 `saveProject` 抛 P2025 变 500、`deleteProject` 把"没删到任何行"报成删除成功。
- 决策一（规则单源搬到可测层）：`src/lib/forms.ts` 收 `LIMITS`（标题 120 / 标签 10 个 / 单个 24 / 总结 500 / 项目名 80 / 简介 200）、`ID_PATTERN`、`SLUG_SOURCE` 与从页面里搬出来的 `safeCallbackUrl`。**搬的理由是能被 `node --test` 直接 import**：留在 Server Component 页面里就测不到，而"反斜杠能不能绕过回调"这种判定恰好需要一条常驻测试。
- 决策二（`VAL_001` 具名字段）：`parseInput` 返回 `{ok,input} | {ok:false,field}`，回跳形态从 `?error=VAL_001` 扩成 `?error=VAL_001&field=title`。**这是往既有的 URL 参数约定里加一个参数，不是换约定**——I031 定案的"页面动作一律 redirect、结果可用 URL 截图留证"原样成立。被否的替代是让动作"不 redirect 直接返回"：那样 `title/slug/tags` 仍会从库里重渲染丢掉，React 在动作后还会重置表单，真要留下输入只剩 `useActionState` 包一层客户端表单壳，正是本项目要避免的东西。
- 决策三（丢稿两道防线）：第一道是浏览器侧 `required`/`maxLength`/`pattern`，让最常见的触发点在提交前就出不去；第二道是 `Editor` 在捕获阶段把两份正文写进 `sessionStorage`（键 `laity:draft:<id|"new">`），**仅当页面带 `?error=` 回来时**才在 `useState` 的初始函数里回填，回填后立刻删除暂存。选初始函数而不是 effect 里的 `setState`，是因为 eslint 的 `react-hooks/set-state-in-effect` 拒绝后者，而这条路径本来就该在首次渲染落定（预览区与 dirty 判定读同一份 state）；`typeof window === "undefined"` 的守卫不能省——客户端组件也要过服务端那一遍渲染。
- 决策四（删除项目两步生效）：`SubmitButton` 加 `confirmLabel`，第一次点击只把文案换成"再点一次确认删除"并置上隐藏位 `confirmDelete=on`，第二次才提交；服务端缺这一位就回 `PRJ_003`。**这条边界必须写明**：它是防手滑，不是访问控制——脚本直调照样能带上该位，和 LOG_003 的自证性质同一口径。日志的彻底删除仍要求原样回填 slug（那条是不可逆且判据更强）。
- 决策五（配置状态不再外泄）：`Configuration` 文案改为"登录没有配好，服务器侧缺少必需的密钥或地址，请查看服务端日志。"，并由测试钉住它不含 `NEXTAUTH|SECRET|_URL|ADMIN_PASSWORD`（不区分大小写）。AGENTS.md 早就写了"配置状态只在服务器日志、公开页不透露"，这轮是补齐文案这一处。
- 决策六（脏 id 与并发删除）：`id` 一律过 `ID_PATTERN` 才允许拼进回跳地址；`saveLog/saveProject` 前校验 `projectId` 存在（动作层取一次 id 集合，只取一列）；`P2025` 不再抛 500，更新与删除各自回 `PRJ_004`。**`deleteProject` 原先把 P2025 判成"已经是删除状态"返回 `ok:true`**，页面会显示删除成功而那一行可能还在列表里——按"没删到任何行就是失败"改正。
- 一处护栏真拦住了我：`pattern={SLUG_PATTERN.source}` 在浏览器里报 `Invalid character class`——属性按 `v` flag 编译，字符类里尾随的 `-` 在那儿非法。改成 `SLUG_SOURCE`（`-` 转义）并由服务端从它派生 `SLUG_PATTERN`，再加一条"两侧都能编译"的测试。这不是我想多了，是控制台先报的。
- 材料窗口第四次被挤破：`①+②` 涨到 1501 行、`src/proxy.ts` 被前窗口切开，`assertWindowFit()` 拒绝出件。按它给的处置把 `src/lib/image-signature.ts`（46 行，读文件头比表、调用方上传动作本就在折走段）从 ② 平移进 ③，出件 6213 行 / 125 页 / 收录 65，幂等复跑 MD5 相同。`tmp/whole-check.mjs` 的 MUST 清单同步摘掉该文件并注明理由——**这份清单是我自己写的，分带调整后它先报了假错**，两处都得跟着真实设计走。
- 记账不动手（范围外，按我点名的"只修正确性"）：8 处状态横幅缺 `role=alert`；`confirmSlug` 输入框仍只有 placeholder；`/login` 的 `<main>` 无 `id="main"` 且无跳转链接；日志正文里的 `#` 会被渲染成第二个 `<h1>` 且脱离字号系统（`globals.css` 只样式化 `.log-body h2/h3`，sanitize 默认 schema 放行 h1）；后台导航缺 `aria-current`/`aria-label`；`globals.css` 三处硬编码 `#e7e7e2`；`licenses` 页 `text-[13px]` 不在字号阶上；复选框 `items-baseline` 错位；首页仍全量取日志再 `slice(0,3)`、`listAdminLogs` 零调用未删；节流桶不回收（内存无界）；`/admin` 的 `notFound()` 落公共 404；四处日期渲染口径不一；`login/page.tsx` 里两次 `await connection()` 重复。另有一条判断记录：登录失败与审计日志本站不做（与 `/privacy` 的"不追踪"承诺冲突，单人站价值≈0），`sensitiveConfirmed` 维持自证不改。
- 未实测（如实标注）：`PRJ_003` 的服务端分支——助手在本机把删除目标指向真实项目"地球 Mirror"被运行时安全策略拦下（判据合理：那是不可逆动作，我没有拿到对该资源的点名），我没有换写法绕；已验的是客户端第一次点击只置位不提交、第二次点击在**临时项目**上真删成功并回显 `?deleted=1`，服务端那一行的代码是同一处判定的取反。HTTP 层 `AUTH_001`（I013）、真实 OSS 上传成功分支、nginx `limit_req` 线上计时、`:focus-visible` 视觉环同上一轮仍未实测。

### D27：第一条真实数据、上传链路的三层根因，以及"美观"这轮改的是可感知缺陷
- 背景：我第五次让助手"运行程序并按经验优化，重点看页面美观和功能权限"。开场先出了两件事：本地库里的数据是我自己删的（不需要恢复），以及我点名"真实上传成功分支不能上传成功"。于是这一轮的顺序是：**先把本项目自己作为第一条真实数据入库存证 → 把上传查穿 → 再按实测缺口改观感与无障碍**。
- 决策一（第一条数据必须是真实的）：库里清空后我拒绝用 `prisma db seed` 把示例数据灌回去——那条日志讲的是"地球档案"的假情景，印章下的内容与我的真实研发过程无关，演示不了发布链路。改成以本项目自己入库：项目 `laity-archive`（Laity 项目档案库，product/WIP，仓库地址即 GitHub），日志 `archive-itself-as-first-entry` 写这次入库决定本身。全程走后台表单：新建项目 → 保存草稿 → 保存并发布 → 前台读印章。
- 判据（本机实测）：发布后前台 200，印章 `73020c50d142c3d7affd6211d0f6ee9dae80ec4a26875df9d6ed0b880358f15b`；用 D5 口径（`title + "\n" + before + "\n" + after`，UTF-8）在浏览器里对**服务端从库里渲染出来的三个字段**独立重算 SHA-256，得到同一串；`PUBLISHED AT · 2026-11-04 10:59 UTC` 取服务器时间。概览 `PROJECTS 1 / PUBLISHED 1 / DRAFTS 0`。这条数据同时把 D26 的"先存再发"与逐字段错误回跳在真实内容上验了一遍。
- 入库过程撞出 I060：填仓库地址时表单**静默不提交**——`pattern="https?://\\S+"` 写在 JSX 属性里是两个反斜杠，浏览器要求 URL 中真有一个反斜杠，任何合法 https 地址都无效。判据是 `[...form.elements].filter(e => e.willValidate && !e.checkValidity())` 指到 `repoUrl`，以及 `getAttribute('pattern')` 读回来确实是 `https?://\\\\S+` 的形状。这一条和上一轮的 `SLUG_PATTERN.source` 是同一个坑：**正则字面量的 source 不能直接喂给 HTML 属性**（属性按 `v` flag 编译，字符类尾随 `-` 也非法），故两处都改成 lib 里的"源串单源"，服务端 `RegExp` 从它派生，并加"两侧判定一致"的测试。
- 决策二（上传：一个症状，三层根因）。查法是先排除最容易误判的一层——Node 里直接跑 `sniffImage()`，同一份 PNG 返回 `{ext:'png'}`，说明**不是**内容签名的问题。剩下三个 IMG_001 出口无法从外部区分，我在动作里临时把形状数字经既有 `code` 字段带回页面（只带数字，不带内容与凭据，用完即删），实测 `blob=70 ab=70 type=image/png`：
  ① `formData.get("file") instanceof File` 为假——Server Action 参数跨 React 边界反序列化后是 **Blob**，于是任何上传都被判"类型/大小不合格"。这条把 `instanceof File` 写了两周的代码判死，也是那条长期标着"未实测"的分支其实一直不可用的真因。
  ② 改判 Blob 之后仍然 IMG_001。用服务端日志看动作耗时（7ms → 248ms 的变化本身说明它开始真走网络），定位到 `oss.ts` 的"安全断言" `!/^[a-z0-9./-]+$/.test(key)`：对象名里的时间戳来自 `toISOString()`，必然带大写 `T` 与 `Z`，**断言把自己生成的每个键都拒了**。
  ③ 写回归测试时发现第三处：该断言的白名单里 `.` 与 `/` 都在，`logs/../etc/passwd` 完全通过——注释里"排除目录穿越"这句话此前是假的。现在逐段判，空段/`.`/`..` 全拒，并要求落在 `logs/` 前缀下（与 RAM 策略的 `resources` 限定一致）。
  结构处置：键生成与断言从 `oss.ts` 拆到新文件 `src/lib/object-key.ts`，理由与当初把 `sniffImage` 拆出 `image-signature.ts` 完全相同——留在 `oss.ts` 里就进不了 `node --test`（它会拉起 ali-oss），"生成器比断言宽松"这类矛盾就只能靠人肉发现。
- 上传判据（端到端，真实写入）：70 字节合法 PNG 两次上传均回 `已上传 · 70 字节` 并在光标处插入 Markdown；直链 `https://laity-archive.oss-cn-beijing.aliyuncs.com/logs/2026-11/20261104T112157Z-72fc4931e9ca.png` 用 `<img>` 加载成功（`naturalWidth=1`，跨域 fetch 被 CORS 挡所以不能用 fetch 判，这一点记进方法）。探针图片**没有**写进任何日志正文（编辑器里的引用已回退，未落库）；桶里两个 70 字节对象由我手工清理或交给生命周期规则（应用按设计无删除权限），记 I062。
- 决策三（"美观"这轮只改可指认的缺陷，不改视觉语言）：上一轮已实测过排版与对比度没有缺陷，这轮改的是量出来的七项，全部属性级或样式表内，零新依赖、不动 `next.config.ts`。① 10 处状态横幅补 `role="alert"`（后台 9 处 + 登录页那条最常被读到的），编辑器的上传提示按语义再分 `role="alert"` / `role="status"`——实测活区在真 DOM 里可读；② `confirmSlug` 补可访问名（此前只有 placeholder，一输入就消失，而这个框要求的是"原样输入标识"这种关键信息）；③ `/login` 的 `<main>` 补 `id="main"`；④ 正文里的 `#` 由渲染出口降级成 `h2`，并给 `.log-body` 的 `h1`（降级前的兜底）与 `h4–h6` 补上字号阶内的观感——实测临时日志里 `# 一级` 与 `## 二级` 都是 24.3px Noto Serif SC、`#### 四级` 是 18px，**页面上 `h1` 总数从 2 变 1**；⑤ `globals.css` 三处硬编码 `#e7e7e2` 改回 `var(--color-hairline)`（令牌定义处仍是一处字面量，实测 grep 只剩那一行）；⑥ `/licenses` 三处 `text-[13px]` 归到字号阶的 `text-sm`；⑦ 勾选确认行 `items-baseline` → `items-center`（基线对齐把复选框拉偏）。临时日志建完即删，删后概览回到 `1/1/0`、其 slug 前台 404。
- 被否与仍未做：`aria-current` 不给后台导航——Server Component 看不到 pathname，为 3 个链接要么引 `headers()` 要么包一层客户端组件，代价与收益不称；首页全量取日志再 `slice(0,3)`、节流桶惰性回收、`/admin` 的 `notFound()` 落公共 404（要新建 `admin/not-found.tsx`，新文件要吃后窗口容量）三项按判据留在 I058；`deleteProjectAction` 的 `PRJ_003` 服务端分支仍**未实测**（上一轮被安全策略按不可逆动作拦下，这轮我没有把删除形状的请求指向真实项目）。
- 门禁与材料：`lint` 0、`tsc` 0、`npm test` **71/71**（新增 object-key 三条：生成键必过自身断言、穿越与控制字符被拒、月份补零形状；以及 REPO URL 两侧一致）、`build` 0。窗口护栏第五次拦下出件：`④` 涨到把 `globals.css` 头部切在后窗口外，按它的建议把 `src/app/privacy/page.tsx`（88 行、纯静态承诺文案）从 ④ 平移进折走段 ③，出件 6313 行 / 127 页 / 收录 66、必须整份可见 28 个文件；`tmp/whole-check.mjs` 的 MUST 清单同步摘掉隐私页（它又先报了假错——**清单是我写的，分带一变它就必须跟着变**）。连续两次生成 MD5 相同；凭据扫描四组控制组全命中后，产物 7 处命中逐行读为环境变量名、参数名与规则描述，无值。

### D28：第六轮"功能权限"收口——把兜底机制自己变成攻击面的那一条
- 背景：我第六次让助手"运行程序并按经验优化，重点看页面美观和功能权限，可以暂时突破相关 md 文件的限制，需要口令时通知我"。开场就有一件事要如实说：**会话已过期**（上一轮我 10:51 左右登的，12 小时有效期），助手没有向我要口令值，而是把需要登录的验证留到最后并来通知我登一次。所以这一轮它先做了两件不依赖会话的事：把上一轮记账的九项里"改得起且有判据"的落地，再对剩余项逐条给做/不做的理由。
- 环境限制先说清（免得被当成"量过了没问题"）：应用内浏览器**没有可用视口**（`window.innerWidth` 为 0、`document.documentElement.scrollWidth` 125），所以响应式与溢出这类宽度相关的判据在这台机器上量不出来；前台动态路由用 `fetch()` 只能拿到 PPR 静态壳，正文要在顶层导航后才能读。这一轮的"美观"因此只做了**不依赖视口**的可指认项：焦点样式唯一性（CSSOM 里 `:focus-visible` 恰好一条规则，无第二套）、`h1` 数量、字号阶（`text-[13px]` 元素数为 0）、活区与可访问名在真 DOM 里可读。
- 决策一（节流桶回收，I063）：这条最值得改。D25/D21 把应用层节流当"应用被直接暴露时的兜底"，但桶**只在被读到时判过期、过期项永不删除**，而键取 `X-Forwarded-For` 首跳——生产由 nginx 覆写故可信，直连暴露时却是攻击者每次可换一个的值。**防线自己变成内存无界增长点，且触发条件正是它要防的那个场景**，这比"没有兜底"更难看。改法：每次记账前扫一遍删掉窗口走光的桶，再加 512 硬上限，满员按最旧淘汰（宁可少计一个来源也不吃内存）。两条测试分别钉"过期被清"和"伪造 600 键后 ≤512"。
- 决策二（错误码不再回显任意串，I064）：两处后台横幅把 `?error=` 原样打成码标签。危害低（React 转义），但"把来路不明的串当成本系统错误码展示"会污染截图留证。加 `errorCodeChip()`：已知码照打、其余打"未收录的错误码"；`errorTextOf()` 的未知码回落**不动**（既有测试钉着，且登录页不走这条回显）。
- 决策三（后台的"记录不存在"留在后台里，I065）：`notFound()` 落的是公共 404 页，那页只给 `/logs`、`/projects` 两个出口——从后台点进一条已删除的日志就回不了后台。改成在后台外壳内直接渲染面板（`LOG_002` 文案、`role="alert"`、回概览与新建两条出口），**不新建 `admin/not-found.tsx`**：新文件要进收录清单并吃后窗口容量，为一个提示面板不值。面板回显地址里的 id 前先过 `ID_PATTERN`。
- 决策四（首页别再全表捞）：`getSafeLogs` 加可选 `take`，首页由"取回全部已发布日志再 slice(0,3)"改成数据库 `take: 3`。筛选项仍从 `/logs` 的全量取数走，不受影响。
- 决策五（卫生项）：`login/page.tsx` 里两次 `await connection()` 删掉第二处（I059）——同一个函数调两次、两条注释对同一条配置各说一套。回归判据：dev 日志里 `blocking-prerender-random` 计数删前删后都是 0（此前那次是 602→0），`/login` 与 `/` 均 200。
- 仍未做与理由：后台导航 `aria-current`（Server Component 拿不到 pathname，要么 `headers()` 要么包一层客户端组件，为三个链接不划算）；`/logs` 与项目详情的分页与上限（筛选条依赖全量集合，硬切会藏内容）；登录/审计日志（与 `/privacy` 的"不追踪"承诺冲突，单人站价值≈0）；`sensitiveConfirmed` 维持自证不改。**四处日期口径不一**这轮没动：它属于纯排版统一，会一次改到 ④ 段四个文件、只为观感一致，窗口代价不划算——继续留在 I058。
- 门禁与材料：`lint` 0、`tsc` 0、`npm test` **73/73**（新增节流两条）、`build` 0。窗口护栏**第六次**拦下出件：`①+②` 到 1511 行、`src/proxy.ts`（1360–1511）被前窗口切开；按处置建议把 `src/lib/markdown.tsx`（34 行，react-markdown + rehype-sanitize 的一层壳，消毒要求本身在 ④ 的详情页调用处看得见）平移进折走段。出件 6392 行 / 128 页 / 收录 66、说明书 527 行 / 18 页，两次生成 MD5 相同，凭据扫描四组控制组全命中后产物 7 处命中仍全是键名与规则描述。`tmp/whole-check.mjs` 的 MUST 清单第三次同步（每次分带变动都必须回头改它，否则它用假红把人引向错方向）。
- 待会话恢复后补的实测：`errorCodeChip`（`/admin/projects?error=BOGUS` 应显示中性标签）、后台不存在日志的面板（`/admin/logs/<bogus>/edit`）、后台导航 `aria-label` 与活区在真 DOM 里可读、`PRJ_003` 的服务端分支（用自建临时项目验，不指向真实项目）。本轮一律标"未实测"，不用代码读过代替运行结果。——**同日已补**：登录后五项全部按预期读出（`BOGUS` 显示中性 chip；两种形状的脏 id 都落后台外壳；`aria-label` 可读；临时项目 `prj003-selftest-tmp` 上 `requestSubmit` 空 confirm 位得 `PRJ_003` 且未误删，随后两步删除回收；首页 `take: 3` 顶层导航复核通过），过程记自测表第十八节。

### D29：第七轮"上线合规面"——CSP 补进纵深防御的最后一层
- 背景：第七次"运行并按经验优化"。这轮按"每轮换一个量测面"换了**上线合规面**：HTTP 安全头、SEO 完整性、元数据、依赖健康、生产编排。他这次的新授权是"可以增加依赖""可以使用上线"。
- 先说量出来**不是缺陷**的两处（免得日后重查）：sitemap/robots 在 dev 落 `localhost:3000` 是有意的兜底——`siteUrl()` 复用 `NEXTAUTH_URL`，而生产 preflight 硬卡它必须是 https 正式域名、compose 透传给应用，线上必然是真域名；manifest 404 不做——本站不是 PWA，为无必要的清单文件吃收录窗口不划算。
- 决策一（CSP，I066）：全站原先没有任何 Content-Security-Policy，XSS 防线只有 rehype-sanitize 一层。先读了 `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`（版本红线要求的动作），**官方的 nonce 方案与本站 PPR 不兼容**（nonce 要求全站动态渲染，静态壳拿不到 nonce；文档原话 "Partial Prerendering is incompatible with nonce-based CSP"），而 `cacheComponents` 是本站的既成架构，不能为 CSP 推翻。取官方"Without Nonces"路径：`next.config.ts` 的 `headers()` 发静态 CSP——script/style 仍需 `'unsafe-inline'`（诚实记录：这一档 CSP 挡不住注入的内联脚本，挡住的是外联脚本、对象、嵌入、表单外提与协议降级），但 `object-src 'none'`、`frame-ancestors 'none'`、`base-uri/form-action 'self'`、`default-src/font-src/connect-src 'self'` 全部卡死。`img-src` 放行 `https:` 是因为正文图片走 OSS 直链、域名随桶走，硬编码桶域名会造出第二处漂移点。dev 变体加 `'unsafe-eval'`（React 调试栈需要，官方文档明示）且**不含** `upgrade-insecure-requests`（会把 http 子资源改写成 https，http 直连的 dev 自断）。
- 决策二（指纹，I067）：`poweredByHeader: false`，不再透传 `X-Powered-By: Next.js`。nginx 不剥这个头，dev 与生产都在漏框架指纹，一行配置关掉。
- 决策三（依赖健康，I068）：`npm outdated` 实跑——全部依赖落后 major（Prisma 6→7、TS 5.9→7、Next 16.4.3→16.4.5 patch）。技术栈锁定原则下**不升级**；`npm audit` 在本机从未跑成（npmmirror 的 security 端点未实现），记 I068 OPEN 等批一次 `--registry=https://registry.npmjs.org` 的一次性审计——**有没有已知 CVE 从来没有数据**，这条只有他能解。
- 决策四（上线面）：他授权"可以使用上线"。AI 能替他做的部分做完：镜像 `laity-archive:round7` 构建冒烟通过（exit 0，1.95GB，standalone 产物含新配置）；生产编排与 preflight 无需改动。**真正 `up -d` 仍在服务器上、仍归他本人**——AI 没有服务器凭据，这是 AGENTS.md 的既有分工不是本轮新增限制。
- 实测判据（全部真实执行）：`curl -I` 看到完整 CSP 头且 `X-Powered-By` 消失；浏览器全程（首页/后台/编辑/保存草稿/删除）控制台 **0 条 CSP violation**，HMR websocket 正常（`connect-src 'self'` 没自断）；临时草稿 `csp-selftest-tmp` 的创建与两步删除在 CSP 下照常走通（Server Action POST 未被 `form-action 'self'` 挡住），删除后前台 404；未登录访问 `/admin` 仍 307。临时资源已全部回收。

### D30：视觉令牌切换裁决——切到 `#f4f1ec` 语义化令牌体系（待实施）
- 背景：外部《优化设计方案》《整合设计方案》与配套原型 HTML 建议把纸白从实测的 `#FBFBF9` 改为 `#f4f1ec` 一组
  语义化令牌。按负责人点名"视觉令牌是否切换 根据你的经验判断"，本轮给出裁决。
- 决策：**切换**。依据四条：①语义化 10 项令牌优于零散 4 项灰阶，后续加色（绿/金/赤字）有位置可放；
  ②三份独立产物一致收敛于 `#f4f1ec`，设计意图明确，`#FBFBF9` 更像早期实现漂移；③暖纸更贴合"档案馆"隐喻、
  18px 宋体 / 行高 1.85 的长文更耐看；④对比度重算后新体系最差文本对比 5.56:1，仍 ≥ WCAG AA，合规档位不变（见下表）。
- 旧→新映射表：

  | 现行实测（旧） | 新令牌（新） | 变化 |
  |---|---|---|
  | 背景 `#FBFBF9` | `--paper` `#f4f1ec` | 暖纸，略深 |
  | 主字 `#131313` | `--ink` `#1a1a18` | 近黑，略暖 |
  | （无） | `--ink-2` `#45423b` | 新增次级文字色 |
  | 辅助字 `#5C5C5C` | `--ink-3` `#625d53` | 暖灰 |
  | 极细线 `#E7E7E2` | `--rule` `#d9d2c5` | 暖线 |
  | （无） | `--rule-strong` `#b9b0a0` | 新增稍强分隔/按钮边框 |
  | （无） | `--brown` `#7a5a3a` | 新增链接/编号/当前导航色 |
  | （无） | `--green` `#1f5a4a`、`--gold` `#9a7228`、`--pos`/`--neg` `#2f6b4f`/`#a03a33` | 新增数据与状态色 |

- 对比度重算（WCAG 对比度，脚本实测算得）：

  | 组合 | 对比度 | 判定 |
  |---|---|---|
  | 旧 `#FBFBF9` / 辅助字 `#5C5C5C`（现行最差） | 6.45:1 | AA |
  | 新 `#f4f1ec` / `--ink` `#1a1a18` | 15.47:1 | AAA |
  | 新 `#f4f1ec` / `--ink-2` `#45423b` | 8.90:1 | AAA |
  | 新 `#f4f1ec` / `--ink-3` `#625d53` | 5.81:1 | AA |
  | 新 `#f4f1ec` / `--brown` `#7a5a3a`（新体系最差文本对比） | 5.56:1 | AA |

- 代价与执行协议（缺一不可）：①出全站色值替换清单（见上表），改 `globals.css` 令牌定义与各组件内联色值；
  ②更新本文件 D21 的对比度判据（最差 6.45:1 → 5.56:1，仍 AA）与 SPEC 验收基线；③重出软著材料（说明书内令牌
  代码与截图随之更新，吃收录窗口容量，见 ISSUES 窗口相关条）。
- 状态：**部分实施（2026-11-05，A1 已落）**——按负责人"先做背景，剩余令牌出方案再逐步批"的节奏：
  纸白背景已切 `#f4f1ec`（`globals.css` 的 `--background`，`--color-paper` 改为 `var(--background)` 引用；
  `src/proxy.ts` 的 404 内联页背景同步），主墨 `--ink` 已随 **A1** 切到 `#1a1a18`
  （`--foreground` 为单源，`--color-ink` 与 `:focus-visible` 均引用它，Proxy 三处主墨同步）。
  **仍未切换**：`--ink-3`（辅助字，A2）、`--rule`（极细线，A3）、`--rule-strong`、`--brown`（B1 已批准待做）、
  `--ink-2` 与数据色（按裁定**不引入**）；`--paper-2` 按下方修订行废弃。**焦点框已随主墨到 `#1a1a18`**。
- 焦点框：沿用 `--ink` 保持最强可视性；若改 `--brown`，非文本对比 5.56:1 满足 ≥3:1。
- 修订（2026-11-05，随 I072 裁定）：草稿《最终整合设计方案》3.1 里的 `--paper-2 #efeae1`（页脚稍深背景）
  **不纳入本映射表，裁定废弃**——负责人口径"极简单人形态无需次级背景色"；本站页脚与正文的分隔
  由 1px `--rule` 细线表达，再加一档背景色只多一个维护点、换不来可见收益。页脚沿用 `--paper`，
  实施时不需要为它找替换点位。
- 修订（2026-11-05，随 I073 裁定）：**`--color-hairline`（现值 `#e7e7e2`）豁免 WCAG 1.4.11 的 3:1 非文本对比度要求**，
  色值不改。它在新纸白 `#f4f1ec` 上实算 1.10:1，但旧纸白上本来就是 1.20:1——不是本轮引入的退化，
  且按本表切到 `--rule #d9d2c5` 也只有 1.33:1，切完并不能解决；要达 3:1 线色须压到 `#948a77` 一档，
  代价是失去"极细线"观感。裁定理由：**它是装饰性分隔线、非功能性组件边框**，全站可交互组件的状态
  都由文字色（5.94 / 16.49:1）与 `border-ink`（16.49:1）表达，去掉所有细线不损失任何信息；
  禁用态按钮边框允许保持 1.10:1（识别性由文字色从 `#131313` 降到 `#5c5c5c` 承担）。
  完整实测对拍与方法边界见 ISSUES 的 **I073**。
- 实施进度（2026-11-05，按负责人"逐步执行、每步一 commit"的口径，方案见
  `docs/00-开发方法论/D30-剩余令牌切换方案.md`）：**背景**已切 `#f4f1ec`；**A1 主墨**已切 `#1a1a18`
  （`--foreground` 改值，`--color-ink` 与 `:focus-visible` 改为引用它，消掉"两个令牌同一颜色 + 焦点框第三处
  字面量"这两处漂移；`src/proxy.ts` 内联样式三处主墨同步）；**A2 辅助字 / A3 极细线 / A4 收尾**未做，
  B1（当前导航改 `--brown`）已批准但排在 A 阶段之后。裁定：`--ink-2` 与四个数据色**不引入**（无承载物）、
  `--rule-strong` **不用于按钮边框**（1.91:1 触发 1.4.11 的组件边界问题，与 I073 的装饰性线性质不同）。

### D31：新增 `/about` 关于页（P1，待实施）
- 背景：差异清单 C1。外部《优化设计方案》要三项导航（含 `/about`），《整合设计方案》与原型 HTML 只有两项。
  负责人点名"新增 /about 关于页"。
- 决策：**采纳新增**，前台导航由两项扩为三项（索引大厅 / 开发日志 / 关于）。定位 P1、静态生成。
- 内容三段：个人简介、技术栈、联系方式。**联系方式走环境变量，未配置显示"待补充"，不虚构**（与 ICP 等
  合规位同一规矩，见 D19）。
- 落点与同步项：`src/app/about/page.tsx`（`id="main"`、`generateMetadata`）、`src/lib/routes.ts` 归属判定、
  `src/lib/sitemap-data.ts`、`SiteNav`/`SiteFooter`（`aria-current`）；SPEC 的 F19、页面路由表与追溯矩阵同步。
- 代价：新页面会进软著收录清单、吃窗口容量（见 ISSUES 的 I069/I070 与窗口相关条）。
- 状态：**已实施（2026-11-05）**。门禁状态「待确认（门禁 3）」按负责人指示暂保留。
- 实施确认（2026-11-05）：①`src/app/about/page.tsx` 新增（三段：个人简介 / 技术栈 / 联系方式；
  `id="main"`、`← 返回首页`、`generateMetadata` 齐备；技术栈只列名称与用途、**不写版本号**，
  避免在 AGENTS 之外造出第二处版本口径；邮箱读 `SITE_CONTACT_EMAIL`，未配置渲染斜体「待补充」）；
  ②`src/components/SiteNav.tsx` 的 `SECTIONS` 加第三项「关于」，`activeKey` 按段边界判定，
  文件头描述与修改记录同步；③`src/lib/sitemap-data.ts` 公开路由清单加 `/about`；
  ④`src/lib/routes.ts` 未改——它是 `/admin`、`/login` 的黑名单制，`/about` 天然判为公开路由，
  D31 原先把它列为同步点，实测不需要；⑤软著材料已重出（`about/page.tsx` 整份在后窗口，
  为腾容量把 `not-found.tsx` 自 ④ 平移进折走段 ③，`assertWindowFit()` 放行、两次生成 MD5 一致）。
  实测判据：`npm test` 73/73、lint/tsc/build 全 0、路由表 `○ /about`（静态生成）；
  浏览器 hydrated DOM 三条判据通过——三段文案正常渲染无乱码（UTF-8）、仅「关于」项带
  `aria-current="page"` 且计算色为 `rgb(19,19,19)` 加实线边框、「待补充」计算样式 `font-style: italic`
  且 `mailto` 链接数为 0（证明确实走了未配置分支）。
  **未做**：其余令牌切换（见 `docs/00-开发方法论/D30-剩余令牌切换方案.md`，待批准）。

### D32：核心文档体系重构——SPEC 转 V1.0 冻结口径，DESIGN 补裁剪地图与执行档案定位
- 背景：2026-11-05 负责人点名"重构项目的核心文档体系"，先做一轮全量对比再动手。对比量出的不是
  文风问题而是**会误导下一轮的事实漂移**：SPEC 上线基线仍写"48 条断言全绿"而实测是 73 条
  （本轮 `npm test` 实跑 73 pass / 0 fail）；SPEC§九标题仍写"待负责人裁决"而§十同日已裁决；
  D31 把导航三项写成"索引大厅 / 开发日志 / 关于"，而现行导航是"字标 + 开发日志 + 作品档案"
  （`SiteNav.tsx` 的 `SECTIONS` 只有 logs 与 projects，首页由字标承担）；`docs/archive/README.md`
  仍说"受控文档只有三份、决策到 D29"。此外 Phase 1–7 已全部闭环，路线图通篇还是"计划 + 待验收"
  的语气，新人读完会以为项目尚未开工。
- 决策：本轮只重写 SPEC.md 与 DESIGN.md 两份，按四条动作走——① SPEC 严格界定 V1.0 范围为
  **F01–F18**，把 F19（/about）单列"已裁决待实施"不混入冻结范围，并新增「冻结状态与变更规则」节；
  ② 历史草稿里**符合单人形态却遗漏**的需求（三时间字段分工、口令未配置不泄露配置状态、
  双层限流与 XFF 覆写、magic bytes 与对象名逐段断言、下钻页不进导航、响应式无横向滚动、
  "待补充"不虚构、合规位未配置不渲染、敏感信息九类形态与服务端执行、GitHub 商标声明）
  整合进对应 F 条目并标「草稿整合」，与现行形态冲突的旧稿设定登记在 SPEC§八 C9/C10 判为不实现；
  ③ DESIGN 新增「零·补、历史决策裁剪说明」，把 D2→D20 的取代关系和 V2.0 多用户搁置边界写成
  读 ADR 前必看的一节，并给路线图补执行档案定位；④ 数字一律取实测值（48→73），单一来源原则写明
  "架构总览只在 DESIGN§零，SPEC/README 只引用不复述"。
  **被否的备选**是"五份一次改完"——AGENTS.md 的改动需逐条点名授权，且同轮改五份会让任一处的
  事实错误同时污染其余四份的引用基线；也否掉了"把被取代的 D2 正文删掉"，那直接违反本文件的
  留痕铁律（旧文只加注、不删除）。
- 理由：文档体系最大的失效模式不是写错，是**旧口径读起来像还有效**（I044/I049 两条都是这么来的）。
  裁剪地图与冻结规则是把这类风险交给结构和机器判，而不是交给下一轮的人记得住。
- 代价与边界：① 本任务的第一轮只落了 SPEC 与 DESIGN 两份；同日第二轮按负责人点名继续完成任务 1–4，
  因此原判"README 无冲突判定身份""AGENTS 文档体系表缺 README 行""archive README 的 D1–D29 与
  三份受控文档表述过期""README 用 `npm install`"四处过期**已全部修复**（AGENTS 文档体系表新增优先级 0
  的 README 行、已知坑速查新增"文档数据与代码实际不符"一行、archive README 改五份受控 + D1–D32 +
  原型过期注记、README 全文重写为项目入口并用 `npm ci`），逐条记 I071（FIXED）；本轮新登记的
  唯一新登记的待裁定项是 **I072**——D30 映射表缺草稿的 `--paper-2 #efeae1`，需裁定收编或废弃；
  **同日已裁定废弃**（负责人口径"极简单人形态无需次级背景色"），I072 转 WONTFIX、D30 末尾追加修订行
  使映射表与裁决一致；
  ② 留痕优先使 DESIGN 越来越长，本轮用裁剪地图缓解阅读成本，但没有解决"文件体量"本身；
  ③ F19 保持编号不变（不改叫 F19.0 或挪位），代价是功能清单里出现一个"待实施"条目，
  读的人需要看小节标题才知道它不在冻结范围。
- 判据（本轮实际执行）：SPEC.md 重写后 361 行；DESIGN.md D1–D31 正文一字未改（编辑只落在文件头留痕、
  §零、§零·补、§二 前言、索引表与 D32 本身）；`npm test` 实跑 73 pass / 0 fail；文档改动全程未触碰
  任何 `.ts`/`.tsx`/配置/迁移，故 lint/tsc/build 与软著材料窗口不受影响（材料收录清单内无 md）。
  台账计数按明细表实测核对：75 行 / 72 个编号（I001–I072，I034 含 4 行续记），
  状态分布 FIXED 53、WONTFIX 6、OPEN 9、PLANNED 6，另有 I034 首行为指针行不计入分布——
  这是"文档数字必须与实测对拍"这条新防线的第一个自证案例。
- 连带：SPEC.md（全文重写）、本文件（§零 补技术栈分层与单一来源声明、新增 §零·补、§二 补执行档案定位、
  新增 D32 与索引行）、README.md（重写为项目入口）、AGENTS.md（文档体系表 + 已知坑速查各一行，纯增量）、
  ISSUES.md（新增 I071/I072 并同步概览计数）、`docs/archive/README.md`（边界声明改五份受控 + D1–D32 +
  原型过期注）。**本轮未改：任何源码、`next.config.ts`、CI、锁文件、软著材料。**

## 决策索引（D1–D32 一览）

编号按落定顺序分配，因此在正文里并非按数字排列。下表按编号汇总，便于反查；状态与正文保持同步。

| 编号 | 一句话 | 状态 |
|---|---|---|
| D1 | 写操作走 Server Actions，不建 REST 层 | 有效 |
| D2 | 鉴权用 NextAuth GitHub Provider + 白名单 | 已被 D20 取代 |
| D3 | 渲染以 RSC 为主，不引客户端状态库 | 有效 |
| D4 | Markdown 管线固定 react-markdown + rehype-sanitize | 有效 |
| D5 | 摘要口径 `SHA-256(title + "\n" + before + "\n" + after?)` | 有效（改即不兼容历史印章） |
| D6 | 生产镜像多阶段构建 + standalone | 有效 |
| D7 | 详情页真 404 由 Proxy 前置判定 | 有效 |
| D8 | 先 JWT 会话，数据库会话留作后续 | 有效（D20 修订载荷） |
| D9 | 已发布日志保存即退回草稿 | 有效 |
| D10 | 项目页公开口径 = 字段白名单 + 只统计已发布 | 有效 |
| D11 | 登录页自建，落 `/login` | 有效 |
| D12 | 上线门禁一次性 preflight 硬卡 | 有效（D20 修订判定项） |
| D13 | 首页看板与精选走专用取数口 | 有效 |
| D14 | 下架动作独立存在，错误返回描述按实现改写 | 有效 |
| D15 | 开 `allowImportingTsExtensions` 共用哈希口径 | 有效 |
| D16 | 补产品骨架：导航、元信息、抓取、可达性 | 有效 |
| D17 | 上线基线：测试、健康探针、错误页、合规页 | 有效 |
| D18 | 把门禁与材料核对交给 CI | 有效 |
| D19 | 外部合规方案先裁定位、再逐条吸收 | 有效 |
| D20 | 取消 GitHub 登录，改为管理员口令 | 有效 |
| D21 | 可达性、提交反馈、三层判定统一 | 有效 |
| D22 | 边缘覆写 XFF，未配口令留服务器提示 | 有效 |
| D23 | 退出不再经框架英文确认页 | 有效 |
| D24 | 动效与丢稿保护 | 有效 |
| D25 | 发布＝先存再发；会话寿命 12 小时 | 有效 |
| D26 | 后台写路径正确性收口 | 有效 |
| D27 | 第一条真实数据、上传三层根因 | 有效 |
| D28 | 兜底机制自身成攻击面的收口 | 有效 |
| D29 | CSP 补进纵深防御最后一层 | 有效 |
| D30 | 视觉令牌切换裁决：切到 `#f4f1ec` 语义化令牌体系 | 已裁决；**部分实施**（背景 `#f4f1ec` + A1 主墨 `#1a1a18` 已落；A2/A3/A4 与 B1 待逐步执行） |
| D31 | 新增 `/about` 关于页（P1），导航扩为三项 | **已实施（2026-11-05）**，见该节实施确认 |
| D32 | 文档体系重构：SPEC 转 V1.0 冻结（F01–F18）+ 本文件补裁剪说明与执行档案定位 | 有效（本轮即它的落地） |

## 二、分阶段路线图（7 个 Phase，每个都是可运行最小闭环；Phase 8/9 为待裁决备选）

通则：每个 Phase 开新会话 + 执行指令卡；完成后独立验收 → git commit → 截图/日志归档。
文件清单为核心受控文件（脚手架自动生成的配套文件以实际为准）；清单外一律不动。

> **执行档案定位（2026-11-05，D32）**：Phase 1–7 已全部闭环并独立验收（证据在
> `docs/02-测试记录/` 各 Phase 自测表，判据在 D18/D20/D25–D29 的实测记录），下面各节的
> "交付物 / 允许触碰的文件 / 验收标准"是**当时的执行清单留档**，不再作为待办驱动开发——
> 按它开工只会重做已完成的事。历史文本按留痕原则不改，包括已作废的 GitHub OAuth 前置
> （Phase 3 节内有作废注记）与已取消的 `images.remotePatterns`（Phase 5b 节内有修正块）。
> 当前真正在途的只有两项：**D30 视觉令牌切换**与 **D31 `/about` 关于页**，均标"待实施"；
> Phase 8（法律文本）与 Phase 9（多用户）仍为待裁决备选，前提不成立前不开工。
> 开工前请回到 AGENTS.md 的「常见变更操作手册」与「开工与交付自检清单」按变更类型取配套点。

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

> 2026-11-04 随 D20 作废：本条前置动作与下面验收 1–3 的 GitHub 语义都不再成立。等价判据是"未登录访问 /admin → 跳自建 /login"、"口令正确 → 进 /admin"、"口令错误 → 回 `/login?error=CredentialsSignin` 且不发会话 cookie"，三条均已本机实跑，记录在 Phase-7 自测表第九节。历史文本按留痕原则不改。

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

> 2026-11-02 修正：`next.config.ts` 这一项**作废**。正文图片走普通 `<img>`（`rehype-sanitize` 默认允许
> http/https 的 img/src，`.log-body img` 已限 `max-width:100%`），不经 `next/image`，因此不需要
> `images.remotePatterns`。这是我追认的简化，理由与验证见 docs/02-测试记录/Phase-5b-自测表.md 第四节。

**5b 前置动作（人工）**：开通阿里云 OSS Bucket、配置 RAM 子账号最小权限密钥，填入 .env——外部账号与计费操作由我本人执行，AI 停点等待。

**5b 已确认的 OSS 参数（2026-10-30，均为非密钥信息）**：
- Bucket `laity-archive`，地域华北2（北京），endpoint `oss-cn-beijing.aliyuncs.com`，图片外链域名 `https://laity-archive.oss-cn-beijing.aliyuncs.com`
- 写入前缀固定 `logs/`；Bucket 为公共读，前台 `<img>` 直链匿名读取，因此不需要 GetObject 权限
- RAM 策略 `LaityOssUploadPolicy` 已是最小权限：Action 只有 `oss:PutObject`，Resource 限定 `acs:oss:*:*:laity-archive/logs/*`，无删除、无列举
- 需要的环境变量（**值由我本人写进本地 `.env`，不经过对话、不入库**）：`OSS_REGION`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`（2026-11-02 修正：不再包含 `images.remotePatterns`，理由见上方 5b 文件清单的修正块）
- 安全提醒：这把 AK 与服务器 root 口令都曾在本次对话里以明文出现，材料跑通后应在 RAM 控制台轮换该 AccessKey，并修改服务器口令、关闭密码登录与 root 直登（改用密钥 + `PasswordAuthentication no`），安全组只放行 22/80/443。

**5b 依赖已批准（2026-10-30）**：走 A 方案 `ali-oss@6.23.0`（MIT，最近发布 2025-12-17）。`npm install --dry-run` 实测新增 **68** 个包，直接依赖含 lodash、urllib@2、xml2js、ws、socks 等；装之前逐个核许可证（GPL/AGPL 一律拒），装完把 package.json 与 package-lock.json 的变化一并上报，含被删条目。被否备选：B `@alicloud/oss20190517@1.0.6`（Apache-2.0，dry-run 47 个包，发布更旧 2024-09-17）；C 零依赖自写 V4 签名 PUT（0 个包，但签名细节要等真库联调才暴露，官方文档也写明优先用 SDK）。

**5b 验收标准**：
1. 编辑器上传 png 返回 OSS 外链，正文引用可显示；服务器本地目录无新增图片文件；
2. 上传 .exe 或 6MB 文件被拒绝（IMG_001）。

> 2026-11-02 实测回填（详见 docs/02-测试记录/Phase-5b-自测表.md）：第 1、2 条**未验证**——需要登录态，
> AI 侧没有我的 GitHub 会话（I010），且不伪造会话（I017 已被策略拦过）；待我本人登录点一次上传后回填。
> 静态项：`npm run lint`、`npx tsc --noEmit` 退出 0；跨平台 `npm ci --dry-run` 首跑红（I018 复发，
> Windows 装包把 linux 需要的 `@emnapi/core/runtime@1.11.3` 剪掉了），容器内重算 lockfile 后两侧退出 0。
> `npm run build` **首跑 FAIL**：`ali-oss → urllib@2` 里懒加载 `require('proxy-agent')` 被 Turbopack 静态解析不到，
> 处置要改 build 配置，故先挂 I022 等批准。**2026-11-02 经我批准走 A**：`next.config.ts` 加
> `serverExternalPackages: ["ali-oss"]`（不新增依赖，不装 `proxy-agent`），复跑 build 退出 0；
> 并用 Phase 6a 的 Dockerfile 实构建一次，镜像内 `require('ali-oss')` 与客户端实例化均成功，
> 证明 standalone 产物完整。证据见 Phase-5b 自测表第一、三节。
>
> 同日两处补充（均经我批准，记在 5b 名下）：① `next.config.ts` 加 `experimental.serverActions.bodySizeLimit: "6mb"`。
> 本地 Next 16 文档写明动作请求体默认上限 1MB，`>1MB` 的图会在进 `uploadImage()` 之前被框架拒掉且不映射 IMG_001，
> 也就是 SPEC 的「≤5MB」此前根本达不到；6mb 与 nginx 的 `client_max_body_size 6m` 配套。② 5b 之后做过一轮全仓库双轴审查，
> 把 D5 哈希口径、`pickParam`/`readField`/`SLUG_PATTERN`、`formatUtc`、错误码文案、`kind`/`status` 合法值
> 收敛成 `src/lib/{content-hash,forms,time,error-text,projects}` 单源，明细见 docs/02-测试记录/2026-11-02-全仓库双轴审查与收敛重构.md。


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

软著材料（验收第 4 条，2026-10-30 本轮完成）：
- 新增 `tools/软著材料生成.mjs`（清单外，经我批准入库）与 `docs/04-软著材料/` 三份产物：
  源程序文档.html（封面 + 前 30 页 + 后 30 页，50 行/页）、软件操作说明书.md 与 .html（10 页，30 行/页）。
- 登记口径经我确认：软件全称《Laity 项目档案库软件》、版本 V1.0、著作权人张磊；改名字或版本要重跑脚本。
- 页眉页码由脚本画在页内：Chrome 不支持 CSS `@page` 的 margin box（MDN 明确相关属性未被任何 user agent 实现），
  所以不能靠 CSS 生成页眉页码；打印需选 A4、边距"无"、缩放 100%、关闭浏览器页眉页脚。
- 完整性自检：src / prisma 下任何源文件若不在收录清单里，脚本直接报错退出，避免"少交一页代码"这种静默缺失。

前置动作（人工）：服务器就绪、域名解析、生产级数据库口令生成、生产 OAuth App（回调为正式域名）——全部由我本人执行。

验收标准：
1. `docker build` 成功（6a 本机已验）；生产容器启动后 `curl -I https://<域名>` 返回 200，证书有效（6b）；
2. 生产环境变量检查：数据库口令非 root、密钥不与开发环境复用（粘贴脱敏检查记录）——由 D12 的 preflight 硬卡并打印脱敏行；
3. 线上重跑 Phase 2 验收第 1 条（草稿隔离）与 Phase 4 第 3 条（哈希复核）均 PASS（6a 已在容器化的同一镜像内复现，6b 需线上再跑一次）；
4. docs/04 含源代码文档（按软著要求前 30 页 + 后 30 页排版）与操作说明书（已生成，结构/行宽/分页实测通过；打印成 PDF 的最终观感待我本人核对）；
5. docs/03 存线上带地址栏截图（6b）。

---

### Phase 7：合规收口（单人站可做的部分）
交付物：发布前敏感信息确认门、日志彻底删除、对外文案口径边界、`/licenses` 开源致谢、页脚三项合规位与容器注入修复、泄露应急预案。

背景与裁决：收到一份按"多用户平台"写的合规方案，逐条对照后确认约六成条目的前提在本站不存在。
本轮只吸收与定位无关且零新依赖的部分；多用户整块留作 Phase 9 备选。
对照表与分期见 `docs/00-开发方法论/合规需求差距分析与分期方案.md`，决策理由见 D19。

允许触碰的文件：
`src/lib/{sensitive-scan,publish,licenses,error-text,site}.ts`、`src/app/admin/log-actions.ts`、`src/app/admin/page.tsx`、
`src/app/admin/logs/[id]/edit/page.tsx`、`src/app/{layout,licenses/page,privacy/page,logs/page,logs/[slug]/page}.tsx`、
`src/components/{Seal,SiteFooter}.tsx`、`src/lib/sitemap-data.ts`、`docker-compose.prod.yml`、两份 env 模板、
`tests/{sensitive-scan,licenses}.test.ts`、`docs/00-开发方法论/`、`docs/02-测试记录/`、`docs/04-软著材料/`、SPEC、DESIGN、ISSUES

新依赖：0。schema 与迁移：0——不因为一份外部文档就动数据模型。

验收标准：
1. 扫描器九类形态命中，且 64 位摘要、40 位提交号、版本号与耗时三类反例零命中（`npm test`）；
2. 阻截级命中时服务端拒绝发布（`LOG_003`），删除需回填 slug（`LOG_004`）；端到端点击需本人登录，未验则如实标注；
3. 许可清单与 package.json 对拍通过且无传染性许可；许可值来自 `node_modules` 实测；
4. 访客可见页面不再出现"存证/防伪"，对内注释与软著材料保留原叙事（curl 计数为 0）；
5. `/licenses` 静态预渲染并进 sitemap；三项合规位未配置时对应行不渲染；
6. 合规位变量确实进入容器（`docker compose config` 渲染核对）；
7. 四道门禁全 0，软著材料 `assertWindowFit()` 通过且独立脚本复核关键文件整份同窗口。

### Phase 8 / 9（未开工，等裁决与信息）
- Phase 8 法律文本：用户协议、侵权投诉指引、社区规范——**前提是有多用户与 UGC**，否则写了就是虚假陈述。
- Phase 9 多用户平台：账号体系、租户隔离、Token 存储、Webhook 同步、审核与举报、导出与注销。
  需逐项批准新依赖（口令哈希库）、外部服务与费用（SMTP、短信、内容安全），并重出软著材料、改写事实基座。

## 三、风险清单

| 风险 | 触发条件 | 降级/应对 |
|---|---|---|
| Next.js 实际版本 API 与记忆不符 | 写码时报废弃/不存在 API | 停下读 node_modules/next/dist/docs/ 对应指南；禁止凭记忆修补 |
| 口令是后台唯一准入因素 | 公网对 `/api/auth/callback/admin` 暴力猜测 | 2026-11-04 落地两层：preflight 硬卡 ≥12 位（D12/D20）+ `deploy/nginx.conf` 对该端点单加 `limit_req zone=laity_auth burst=5 nodelay`（`rate=5r/m`，超限由代理直接 429，请求不进应用）。应用侧仍无失败计数与锁定——限速是外部约束，不等于"已防爆破"。本机一次性容器实测：连打 12 次 `200×6 → 429×6`，连打 12 次 `/` 全 200，`nginx -t` 通过（原"GitHub OAuth 回调域名限制"一行随登录方式作废） |
| OSS 开通/计费受阻 | Phase 5 前置动作卡住 | Phase 5 顺延，不阻塞 Phase 6 之外的任何已验收产物；正文暂用免版权图库外链 |
| 小内存服务器构建 OOM | 服务器上直接 build 失败 | 本地/CI 构建镜像后推送，服务器只 pull + run（D6 已按此设计） |
| 弱口令遗留上线 | Phase 6 环境检查发现 root 口令 | 已落地为 D12：编排里的 preflight 一次性容器硬卡，口令/域名/密钥不合格则整个 `up` 失败，不放行 |
| 时区错乱复发 | 任何页面时间显示偏移 | 全链路 UTC（AGENTS.md 已锁），验收含时区核对项 |
| 单人项目密钥泄露 | .env 被提交 | .gitignore 已忽略；独立验收含"git 历史无密钥"检查 |

## 四、里程碑与回滚

- 每个 Phase 验收 PASS 后立即 commit（消息含 Phase 编号），出问题 `git revert` 该 Phase 即可，不跨 Phase 连环回滚；
- Phase 4 完成即达成"可用产品"（能写能发能存证），Phase 5/6 是增强与交付，即使暂停也不影响核心闭环；
- 全程遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md。

## 五、技术债与待还项（已如实记录，不是遗忘）

从各决策的"代价与边界"与台账里提炼。这些都是**知情接受**的取舍，不是漏项；排期时按影响面决定何时还。

| 债 | 来源 | 现状影响 | 还债触发条件 |
|---|---|---|---|
| JWT 会话无服务端即时吊销 | D8 / D20 | 换 `NEXTAUTH_SECRET` 是唯一手段；单条已签发会话过期前撤不掉 | 若要做"立即踢下线"或多管理员 |
| 应用层登录节流进程内、多实例不共享 | D22 边界① | 单容器部署下等同全局；横向扩展即失效 | 真要横向扩展时（需共享存储，新依赖另批） |
| 项目无法"下线"（只能删或改名） | D10 代价 | 想藏一个项目只能删除 | 需要项目级发布开关时（改 schema + 两处查询） |
| 登录 / 审计日志未做 | D28 | 与 `/privacy` 的"不追踪"承诺一致；单人站价值≈0 | 变多用户或需合规审计时 |
| `/logs` 与项目详情无分页与上限 | D28 | 筛选条依赖全量集合，数据量大后首屏变慢 | 已发布日志量级上千时 |
| `sensitiveConfirmed` 为自证、非可信来源 | D28 | 发布确认是本人操作，风险自担 | 若引入他人协作 |
| 四处日期口径不统一（纯排版） | I058 | 仅为观感一致，改动面到 ④ 段四个文件 | 某轮顺带统一即可 |
| 后台导航无 `aria-current` | D28 | Server Component 拿不到 pathname，性价比低 | 后台导航超三个链接时 |
| Prisma 6.19.3 落后 major（7.x） | I005 | 锁定以匹配既定 schema 写法 | 单独立项，含 seed 配置迁移 |
| TypeScript 5.9 落后 major（7.x） | I068 | 技术栈锁定，不跟随升级 | 单独立项 |
| next-auth 4.24.15（非 v5/Auth.js） | I009 | 与 Next 16 官方示例不同代，但三条路径实测可用 | 单独立项，含 cookie 名与 Proxy 读取方式 |
| 软著材料窗口容量紧（改两行就可能顶破） | I034-补2 | `assertWindowFit()` 已把判定交给机器，但每次改动仍要重出 | 长期共存，靠 CI 两步自检兜底 |

## 六、未验证项（待实测）清单

"未验证"是本项目的常态标注，不是缺陷；下列项在具备条件前保持"未验证"，不许用推断补全。

| 项 | 缺哪一步 | 判定方式 | 关联 |
|---|---|---|---|
| 生产编排整套启动 | 需服务器实跑（AI 无服务器凭据） | 服务器上 `docker compose up -d` 后逐项核对 | D18 / D29 / Phase 6b |
| 软著材料打印成 PDF 的真实分页 | 需我本人在浏览器打印一次 | A4 / 边距"无" / 缩放 100% / 关页眉页脚 | I021 |
| OSS 真实上传联调 | 需我本人登录后台点一次上传 | 直链可加载、服务器本地无落盘 | I016 |
| 镜像来源与官方逐层比对 | 需有官方网络 | 按摘要重拉覆盖 | I019 |
| Server Action 的 Origin 校验 | 线上环境 | 后台动作返回 4xx 且日志有 origin 校验失败 | I033 |
| 三款字体上游 LICENSE | 需出网 | 取各字体上游 LICENSE 原文比对 | I040 |
| 依赖已知 CVE | 需批准换官方源跑一次 `npm audit` | `npm audit --registry=https://registry.npmjs.org` | I068 |
| 会话相关交互的少数视觉态 | dev 服务重启后点一次（如"退出中…"禁用态） | 真人点击观察 | D23 / D24 |

> 已完成回填的项不在此列（如 D28 的 `errorCodeChip`、后台非存在日志面板等，同日已按预期读出）。
