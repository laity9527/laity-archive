# 项目事实（AI 必读，违反即返工）

项目：Laity 项目档案库（个人全栈数字档案库：厂牌官网 + 开发复盘证据链）
负责人：张磊
本文件维护人：张磊（AI 不得自行修改本文件；发现事实过期，停下来向我报告）
修订留痕：2026-11-03 由 AI 按我点名"根据你的经验补充 AGENTS.md"补写环境实况、上传与合规事实、
四道门禁与软著材料生成铁律；2026-11-04 由 AI 按我点名"1044 可改"更新三处过期事实——
登录行（GitHub OAuth + 白名单 → 管理员口令，理由与代价见 DESIGN.md 的 D20）、环境实况里"真实上传联调"的前置、
preflight 门禁清单的最后一项；同日再按我点名"I049、I050 可以改，根据你的经验改"更新登录行末尾的
"三处会话判定"（统一到 `requireAdminSession()`）并新增"登录限速两层"一条（见 DESIGN D21/D22）；
除此之外 AI 仍不得自改本文件。
修订留痕续：2026-11-05 由 AI 按我点名"根据你的经验及相关文件继续修改"新增四节——
文档体系与阅读顺序、常见变更操作手册、已知坑速查、术语表；纯增量，未改动任何既有事实行。
修订留痕续二：2026-11-05 由 AI 按我点名"根据你的经验及之前的回答和相关优化设计重新给出五份文档"，
新增两节——环境变量总表、开工与交付自检清单；视觉铁律节末尾追加一条"待裁决"记录（外部设计方案的建议
色值 vs 本文件实测值）。纯增量，未改动任何既有事实行。
修订留痕续三：2026-11-05 由 AI 按我点名"视觉令牌是否切换 根据你的经验判断；新增 /about 关于页"，
在视觉铁律节"待裁决"条后追加"已裁决"裁定（裁定切换 `#f4f1ec` 令牌体系，附依据、三步执行协议与"待实施"标注），
并在"新增一个页面"手册追加"已裁决待实施"一条（新增 `/about` 关于页，P1）。两处均为增量，既有实测值在实施完成前仍然有效。
修订留痕续四：2026-11-05 由 AI 按我点名"重写 README、增量修改 AGENTS（文档体系表新增 README 行、
已知坑速查新增文档数据过期一行）、清理 ISSUES、修正 archive README"，在「文档体系与阅读顺序」表
**新增优先级 0 的 README.md 行**（角色=项目入口，冲突判定不高于事实基座，故排在"代码与运行时实测"之后、
本文件之前是给新人读的顺序而非冲突判定顺序），同节首句"另外三份"随之改为"另外四份"（一个词的一致性修正，
是我这次改动直接造成的，非范围外顺手改）；在「已知坑速查」表末尾新增一行"文档数据与代码实际不符"
（处置=每次发版前用 `npm test` 等实际输出核对文档数字，来源 I071 / D32）。**两处均为纯增量，
未改动任何既有事实行、未改技术选型与视觉铁律。**


---

## 技术栈锁定（不可替换，不建议升级）

- 前端/全栈：Next.js（App Router）+ TypeScript
- 样式：Tailwind CSS（禁止引入其他 UI 组件库、CSS 框架、图标库）
- ORM：Prisma（provider 固定为 postgresql）
- 数据库：PostgreSQL 16（Docker 容器，库名 laity）
- 登录：NextAuth.js v4.24.15（后台 /admin 用，仅此一处），提供方为框架内置的 Credentials（id 固定 `admin`），
  准入只认环境变量 `ADMIN_PASSWORD` 这一把口令——比对方式为两侧各取 SHA-256 后 `timingSafeEqual`，
  未配置或输入为空一律拒绝（配置缺失不等于存在空口令），失败回 `/login?error=CredentialsSignin`；
  登录页自建在 `/login`（I012-B）。2026-11-04 我点名"先取消 github 登录"，GitHub OAuth 与
  `ALLOWED_GITHUB_IDS` 白名单同时退出，决策、代价与未做项见 DESIGN.md 的 D20（勿再按 OAuth 口径写代码）。
  会话判定共三处且**共用同一个入口** `requireAdminSession()`（定义在 `src/auth.ts`）：`src/proxy.ts` 前置守卫
  （matcher 覆盖 `/admin/:path*`，判 `token.isAdmin === true`）、`src/app/admin/layout.tsx`、各 Server Action
  （不依赖前端隐藏按钮）。布局与动作判的是 `session` 回调带出的 `isAdmin`——"存在会话"本身不构成放行理由。
  `src/proxy.ts` 不得 import `src/auth.ts`：口令比较要用 `node:crypto`，不该被拉进前置守卫
- 登录限速有两层，写登录相关代码不要绕开它们再造第三套：生产 `deploy/nginx.conf` 对
  `/api/auth/callback/admin` 的 `limit_req`（rate=5r/m、burst=5，超限由代理直接 429、请求不进应用），
  以及 `src/lib/admin-password.ts` 的进程内节流（10 分钟窗口内同来源 5 次失败即不再建立会话，
  表现与"口令不正确"完全一致）。应用层计数的来源键取 `X-Forwarded-For` 首跳，
  这一跳可信是因为 nginx 在边缘**用 `$remote_addr` 覆写**该头（不是 append），直连时该头不存在、落 `local`
- 包管理：npm（禁止 pnpm/yarn/bun）

### 版本事实（最高优先级）

- 本项目使用的 Next.js 版本与旧版（如 14）存在 breaking changes：API、约定、
  文件结构都可能不同。**写任何 Next.js 代码前，必须先读
  node_modules/next/dist/docs/ 下的对应指南，禁止凭训练记忆使用旧 API。**
- 实测版本（2026-11-03 从 node_modules 读取，不是声明值）：Next.js 16.4.3、React 19.3.0、
  next-auth 4.24.15、Prisma 6.19.3、Tailwind CSS 4.3.3（@tailwindcss/turbopack）、TypeScript 5.9.3、
  ali-oss 6.23.0。本机 Node v24.13.0 + npm 11.6.2。
- Next 16 的两个既成事实，写页面时必须按它来：`cacheComponents: true` + `partialPrefetching`
  （页面默认按 PPR 出静态壳，请求期数据靠 `connection()`），路由段配置 `instant` 的语义是
  "退出即时导航校验"，不是把路由改成动态。
- 依赖已装齐（此前"本地无 node_modules"的降级期已结束）。凡是"未验证"的表述都要注明缺哪一步。
- `next dev` 会自动向本文件写入版本警告块。该块被重新生成属于正常现象，
  不要从 diff 中删除它；连同你的改动一起提交即可。

## 环境实况（方案必须适配，不许假设理想环境）

- 本机现状（2026-11-03）：Node/npm 已装，`node_modules` 就绪，Docker Desktop + 本地
  PostgreSQL 16 容器（`laity-postgres`，库名 laity，口令为仅限本地的 root/root，见 I001）。
- 仍缺的：服务器上的生产编排实跑、真实上传联调（需我本人登录后台后亲自点一次上传；2026-11-04 起不再依赖 GitHub 授权，
  口令是我自己配的，AI 已能在应用内浏览器里走到"需我本人决定"的那一步）、
  `docs/03-功能截图` 的运行截图。这几项 AI 一律标注"未验证"，不得用推断补全。
- GitHub 仓库：https://github.com/laity9527/laity-archive
- 提交与推送由我本人执行。AI 可以提交，但只有我明确说"提交"才算授权，说提交不等于说 push。
- npm 走本机镜像源（npmmirror），其 `security` 端点未实现，所以 `npm audit` 必报错——
  这不是代码问题；真要审计得临时指官方源，属环境改动，需我批准。

### Windows + Git Bash 三个已踩过的坑

- MSYS 会把容器内路径改写成宿主盘符：`docker ... -w /w` 变成 `W:/`、`openssl -subj /CN=` 也被吞。
  带 `MSYS_NO_PATHCONV=1` 前缀执行。
- Node 眼里的 `/tmp` 是 `D:\tmp`，不是 Git Bash 的那个 `/tmp`。临时产物一律写仓库内 `tmp/`
  （已 gitignore，且已排除出 lint，见 I039）。
- 管道接 `| head` 会让退出码变成 SIGPIPE 的假红。要判成败就 `> 文件` 再读，别把命令串在管道尾上取 `$?`。

## 目录与命名约定

```
laity-archive/
├── AGENTS.md                # 本文件：事实基座
├── .github/workflows/       # 发版门禁的自动执行（改它需批准）
├── deploy/                  # nginx 配置与证书挂载位
├── docs/
│   ├── 00-开发方法论/       # 工作法、决策记录、上线与回滚手册
│   ├── 01-研发日志/         # 每日：指令原文、思考、踩坑（现象→根因→修复）
│   ├── 02-测试记录/         # 功能自测表、待验证清单
│   ├── 03-功能截图/         # 真实运行截图（必须带地址栏）
│   └── 04-软著材料/         # 源程序文档、操作说明书（md 是源，HTML 是产物）
├── prisma/
│   ├── schema.prisma        # 数据模型（Project / Log）
│   ├── migrations/          # 迁移只由 prisma migrate 生成，不手改、不对库直接执行
│   └── seed.ts              # 种子；哈希口径必须复用 src/lib/content-hash.ts
├── src/
│   ├── app/                 # 页面路由（App Router）+ api/health + privacy + not-found + error
│   ├── components/          # 核心组件（导航、页脚、时间轴、印章、看板）
│   └── lib/                 # 工具函数（Prisma 实例、哈希、存证、上传、鉴权、站点标识）
├── tests/                   # node --test 用例，只测纯逻辑
├── tools/                   # 软著材料生成器（收录清单与窗口判据在这里）
└── docker-compose.yml       # 本地 PostgreSQL 容器（生产另用 docker-compose.prod.yml）
```

- 页面放 src/app/<路由>/page.tsx；可复用组件放 src/components/；
  数据访问与工具函数放 src/lib/，页面内禁止直接 new PrismaClient。
- 过程性文档一律进 docs/ 对应子目录，不许散落根目录。

## 视觉铁律（精确值，违反即返工）

- 色彩：背景 #FBFBF9（纸白）/ 主字 #131313（纯墨）/ 辅助字 #5C5C5C / 极细线 #E7E7E2
- 形态：border-radius: 0（全局零圆角）；box-shadow: none（无阴影）；无渐变
- 字体：UI 用 Inter；日志正文强制 Noto Serif SC（思源宋体，18px / 行高 1.85）；
  时间戳与标签强制 JetBrains Mono（等宽，font-mono）
- 图标：禁用一切图标库，只允许字符（↗ ← ● ○）
- 版式：内容最大宽 1080px；日志详情限宽 720px；
  日志列表左侧 200px BEFORE/AFTER 时间轴（1px 竖线贯穿）
- 焦点可见性：键盘焦点统一 `outline: 2px solid #131313; outline-offset: 2px`（写在 globals.css 的
  `:focus-visible`），不允许各组件自定焦点样式；跳转链接 `#main` 与 `aria-current="page"` 属既有约定
- 自查方式：交付前 grep 自己的产出，出现 rounded-（非 rounded-none）、
  shadow-（非 shadow-none）、bg-gradient、图标库 import 即自行返工
- **待裁决（2026-11-05）**：外部《Laity 数字档案库 · 最终优化设计方案》与配套原型 HTML 建议把纸白改成
  `#f4f1ec` 一组新令牌（`--paper/#f4f1ec`、`--ink/#1a1a18`、`--ink-2/#45423b`、`--ink-3/#625d53`、
  `--brown/#7a5a3a`、`--rule/#d9d2c5`、`--rule-strong/#b9b0a0`、`--red/#a03a33`），与本文件实测值不同。
  本文件数值来自已上线代码实测，且 D21 的对比度判据（最差 6.45:1）基于现数值算得；换令牌等于全站视觉变更，
  并牵动软著材料里的设计令牌代码，属"锁定项"改动。**在获我点名授权之前一律以本文件实测值为准，不得按
  外部设计稿的色值改代码**；真要走，按"先出全站色值替换清单 + 对比度重算 + 重出软著材料"一条来。
- **已裁决（2026-11-05，负责人点名"视觉令牌是否切换 根据你的经验判断"）**：裁定**切换**到 `#f4f1ec` 令牌体系。
  依据：①语义化 10 项令牌（paper/ink/ink-2/ink-3/brown/rule/rule-strong 及数据色）优于零散 4 项灰阶，后续加色有位置可放；
  ②《优化设计方案》《整合设计方案》与配套原型 HTML 三份独立产物一致收敛于 `#f4f1ec`，设计意图明确，现行 `#FBFBF9` 更像早期实现漂移；
  ③暖纸色更贴合"纸质档案馆"隐喻，18px 宋体 / 行高 1.85 的长文更耐看；
  ④全站对比度重算后，新体系最差文本对比 5.56:1（`--brown` 链接与编号）/ 辅助字 `--ink-3` 5.81:1，均 ≥ WCAG AA 4.5:1；
  现行体系最差 6.45:1。两者同属"AA 达标、未达 AAA 7:1"一档，**切换不改变合规档位**。
  **执行协议（三步，缺一不可）**：①出全站色值替换清单（旧→新一一对应，映射表见 DESIGN.md 的 D30）；
  ②重算对比度判据并更新 DESIGN 的 D21 与 SPEC 验收基线；③重出软著材料（说明书内令牌代码与截图随之更新）。
  **实施状态：待实施**——本节上列实测值在实施完成前**仍然有效**，实施完成后必须回到本节，按实测结果更新为 `#f4f1ec` 一组。
  **焦点框特别约定**：焦点样式沿用 `--ink`（`#1a1a18`）以保持最强可视性；若按设计稿改用 `--brown`，须确认非文本对比 ≥3:1（实测 `#f4f1ec` vs `#7a5a3a` = 5.56:1，满足）。


## 数据与存证约定

- Log 模型关键字段：beforeContent / afterContent（Markdown）、
  beforeDate / afterDate（双时间戳）、isPublished（默认 false，草稿隔离）、
  contentHash（发布时 SHA-256）、publishedAt（服务器时间）
- 发布动作必须同时：计算正文 SHA-256 写入 contentHash、记录服务器时间，
  两者缺一不可
- 摘要口径（D5，改动即与历史印章不兼容，禁止"顺手规范一下"）：
  `sha256(title + "\n" + beforeContent + "\n" + (afterContent ?? ""))`，UTF-8，小写十六进制。
  唯一实现是 `src/lib/content-hash.ts`——运行时、种子脚本、任何复核工具都必须复用它，
  不允许第二处重算。详情页印章与库中 contentHash 不一致时前台显示"存证缺失"告警，不静默隐藏。
- 已发布日志被保存即退回草稿（D9）：旧 contentHash / publishedAt 保留作"上次发布"历史，
  重新发布按当前正文重算并刷新时间。"下架"只翻 isPublished，保留历史摘要与发布时间、正文不动。
- 时间一律存 UTC，展示层再做时区转换，禁止存本地时间字符串

## 合规与安全红线

- 依赖许可：MIT / Apache / BSD 可用；GPL / AGPL 传染性许可一律禁止，引入前必查
- 字体只用开源许可（SIL OFL / Apache 2.0）：Inter、Noto Serif SC、JetBrains Mono
- 图片素材只用免版权图库（Unsplash / Pexels），避让人脸与商标
- 前台数据访问只能走 src/lib 的 getSafeLogs() 类封装（内部强制 isPublished: true），
  禁止页面直接查询 Log 表
- Markdown 渲染必过 rehype-sanitize（防 XSS），禁止 dangerouslySetInnerHTML 裸渲染
- 上传图片禁止落服务器本地，通过 Server Action 转发阿里云 OSS 返回外链
- 图片类型只按**文件内容签名**（PNG/JPEG/GIF87a/GIF89a/RIFF…WEBP 的 magic bytes）判定，
  不信任浏览器上报的 MIME 与文件名；伪造 `image/png` 的可执行文件、文件头不完整一律 IMG_001。
  对象名由服务端生成（`logs/<YYYY-MM>/<UTC 时间戳>-<12hex>.<ext>`），不使用上传文件名。
- 尺寸上限三处必须同步改：SPEC IMG_001 的 5MB、`next.config.ts` 的
  `experimental.serverActions.bodySizeLimit: "6mb"`、`deploy/nginx.conf` 的 `client_max_body_size 6m`。
  框架默认动作体上限是 1MB，会把大图先拒在动作之外且**不给 IMG_001**——改小或漏改都算失效。
- `OSS_REGION` 必须是 `oss-cn-beijing` 这种带 `oss-` 前缀的地域 ID；写成 `cn-beijing`
  会拼出不存在的域名，上传成功但直链 404。RAM 子账号只授 `oss:PutObject` 且资源限定
  `acs:oss:*:*:laity-archive/logs/*`，与代码里硬编码的 `logs/` 前缀一致。
- ICP 备案号走 `SITE_ICP` 环境变量，只在服务端读取、以 prop 传给客户端页脚；未设置就不渲染该行，
  禁止硬凑文案。站点对外标识（域名、站名、描述）唯一来源是 `src/lib/site.ts`，别处不再写死域名。
- 数据库口令：本地开发容器的弱口令仅限本地；生产一律 `${VAR:?}` 从环境变量注入，禁止写进仓库。
  生产编排另有一次性 preflight 容器硬卡：用户名/口令非 root、口令≠用户名、长度 ≥12、
  域名是 https 正式域名、会话密钥 ≥32 位、后台口令非空且 ≥12 位、OSS 四键非空。
- 凭据留痕与验证口径：外部动作（AK 轮换、口令重置）只在文档里记状态
  （"已于 x 月 x 日轮换、旧密钥已删除"），**不记任何值**。AI 需要核实密钥时，
  只报键名与派生判定（是否存在、值长度、是否等于模板值），不回显值本身，也不写进任何产物；
  真实 `.env` / `.env.production` 由我本人填写与维护，AI 不把它当配置来源去读、更不复述其内容。
  产出物（尤其软著材料）交付前必须逐行扫描凭据形态，且先用注入的伪凭据验证扫描器有效再采信。

## 通用红线（任何 Phase 都不得触碰）

- 不得修改 build 配置、CI 配置、lockfile。现有的实体是 `next.config.ts`、`.github/workflows/ci.yml`
  与 `package-lock.json`；确需改动，停下列出理由与影响面等我批准，逐条批不算一批。
- `next.config.ts` 里的 `serverExternalPackages: ["ali-oss"]` 不是可有可无的优化：urllib 懒加载
  `require('proxy-agent')`，Turbopack 静态解析这句就把构建打红了（I022）。删掉它等于删掉构建。
- 凡在本机跑过 `npm install` / `npm update`，必须再在 linux 容器里重算锁文件
  （Windows 安装会静默删掉 linux 平台的 `@emnapi/*` 条目，I018 已复发过一次）。
  CI 的 `npm ci` 跑在 ubuntu 上，就是这条的常驻防线。
- 一次性诊断脚本只写 `tmp/`（已 gitignore、不参与 lint），用完可留可删，不许散落仓库根或 docs/。
- 不得顺手重构本任务范围外的代码；范围外问题记 ISSUES.md，不动手
- 不得新增依赖；确需新增，停下列出理由（含许可证）等我批准
- 数据库变更只改 prisma/schema.prisma 并生成迁移文件，不得直接对库执行
- 每个 Phase 只做该 Phase；禁止"顺便"提前实现后续 Phase

## 文件头注释铁律（软著留痕，优先级高于"少写注释"的通用习惯）

每个手写或经我要求修改的 .ts / .tsx 文件，顶部必须有：

```tsx
/**
 * 文件：[文件名]
 * 描述：[组件或函数的具体作用]
 * 作者：张磊
 * 创建日期：2026-xx-xx
 * 修改记录：
 * - 2026-xx-xx: [本次改动一句话]
 */
```

修改已有文件时追加修改记录行，不许覆盖历史记录。

## 验证命令（验收唯一依据）

四道门禁全 0 才算可发版，`.github/workflows/ci.yml` 在每次 push 与 pull request 上按同一顺序代跑，
AI 不得用"看起来没问题"替代任何一条的实际输出：

- 安装：`npm ci`（不是 install——锁文件必须原样生效）
- 数据库：`docker compose up -d`（postgres:16，端口 5432，库名 laity）
- 开发：`npm run dev`（访问 http://localhost:3000）
- 检查：`npm run lint`
- 类型：`npx tsc --noEmit`
- 构建：`npm run build`
- 测试：`npm test`（= `node --test "tests/*.test.ts"`，Node 自带 test runner，零测试依赖）
- Prisma：`npx prisma migrate dev`（迁移）/ `npx prisma migrate deploy`（全新库应用）/ `npx prisma studio`（查库）
- 生产编排校验：`docker compose --env-file tmp/<哑值文件> -f docker-compose.prod.yml config`
  （变量插值与 healthcheck 渲染核对；真实值只在服务器上）
- 软著材料：`node tools/软著材料生成.mjs`（收录完整性 + 窗口适配，见下一节）

覆盖边界要如实说：`npm test` 只锁纯逻辑（摘要口径、图片内容签名、slug 与表单取值、错误码文案、
时间展示、路由归属）。数据库层、需登录的 Server Action、页面渲染都不在其内，那部分靠
docs/02-测试记录/ 的自测表与人工联调，不能用测试全绿代替。

## 软著材料生成铁律（出件质量，违反即返工）

- 命令：`node tools/软著材料生成.mjs`，产物是 `docs/04-软著材料/` 下两份定页 HTML。
  代码每页 50 行、说明书每页 30 行；总页数超过 60 时只提交**前 30 页 + 后 30 页**。
- Chrome 不支持 CSS `@page` 的 margin box，所以页眉页码由脚本自绘。打印设置：A4 / 边距"无" /
  缩放 100% / 关闭浏览器页眉页脚。**浏览器打印成 PDF 的真实分页尚未实测（I021）。**
- 收录清单是 `tools/` 脚本里的 `BANDS` 数据结构，四段：①数据模型与配置、②核心逻辑、③折走段、
  ④站点外壳与访客界面。`assertComplete()` 保证 `src/` 与 `prisma/` 下没有文件被漏登记。
- 窗口容量**按整页折算，不是固定 1500 行**：后窗口取最后 30 个页块，末页只有 9 行也占一个名额。
  ①②④ 段的文件必须整份落在某个窗口内，被切口打断或整段落进省略段时
  `assertWindowFit()` 直接拒绝出件——任何一次普通改动（哪怕只加两行注释）都可能顶破窗口，
  所以这条判据不能靠人估，也不要绕过它。
- 生成必须逐字节幂等。改了任何收录文件或 `软件操作说明书.md` 都必须重出两份 HTML 并一起提交，
  CI 用 `git diff --exit-code -- docs/04-软著材料` 卡这一条。
- 材料里禁止出现任何真实凭据。自检脚本要先用注入的伪凭据验证扫描器有效，再采信"未见凭据"的结论。

## 文档体系与阅读顺序

本文件与另外四份根文档构成闭环。冲突按下表判定，发现冲突点一律回报、不私自动手抹平：

| 优先级 | 来源 | 角色 | 何时读 |
|---|---|---|---|
| 0 | README.md | **项目入口**：定位、当前状态快照、启动步骤、文档导读顺序。第一次接触本仓库先读它；但它的**冲突判定不高于事实基座**——与 AGENTS/SPEC/DESIGN 不一致时以那三份为准并回报 | 新人上手、对外介绍、找启动命令时 |
| 1 | 代码与运行时实测 | 唯一事实 | 与任何文档冲突时以现实为准 |
| 2 | 本文件（AGENTS.md） | 事实基座：技术栈、环境、红线、验收命令 | 每次开工前必读 |
| 3 | SPEC.md | 需求规格：做什么、做到什么算数 | 改功能前后 |
| 4 | DESIGN.md | 架构决策与路线图：为什么这样做、分几步做 | 涉及结构或取舍时 |
| 5 | ISSUES.md | 范围外问题台账：发现但不动手的事 | 遇到疑似历史遗留问题时先查 |

- 编号即坐标：`F##` 是需求（SPEC）、`D##` 是决策（DESIGN）、`I###` 是问题（ISSUES）、`Phase #` 是阶段（DESIGN）。引用一律带编号，不写"那个某某功能"。
- 三份下游文档互相引用：SPEC 引 AGENTS 与 D 编号；DESIGN 引 SPEC 的 F 编号与 AGENTS；ISSUES 回指 D 编号。改了需求或决策的编号等于重命名，需点名授权。
- 每次只改与本轮任务直接相关的那几行，不做"顺手统一措辞"；范围外的成文问题记 ISSUES，不动手。

## 常见变更操作手册（改一处，跟着改哪里）

单人项目最易出的错不是写不对，是**改漏了配套点**。下列清单照做，做完逐项打勾；清单随项目演化，新增一类变更就在这里加一节。

### 新增一个数据库字段
1. 只改 `prisma/schema.prisma`，再 `npx prisma migrate dev --name <意图>` 生成迁移；不直接对库执行 SQL。
2. 字段若要出现在访客可见范围，更新 `src/lib/projects.ts` / `src/lib/logs.ts` 的显式 `select` 白名单（D10：公开口径由查询层说了算，不靠 `include` 全量返回）。
3. 字段若影响摘要口径，改 `src/lib/content-hash.ts`（唯一实现）——口径变更即与历史印章不兼容，禁止"顺手规范一下"（D5）。
4. 表单要采集就改 `src/lib/forms.ts` 的 `LIMITS` 与 `parseInput`，并在 `src/lib/error-text.ts` 补该字段文案。
5. 补一条纯逻辑测试进 `tests/`，跑四道门禁。
6. 若该文件在软著收录清单内，重出材料（见下）。

### 新增一个页面
1. 页面放 `src/app/<路由>/page.tsx`；取数一律经 `src/lib/`，页面内禁止 `new PrismaClient()`。
2. 访客可见页面必须齐备：正文容器 `id="main"`、持久导航高亮 `aria-current`、`generateMetadata` 给 `title`/`description`。
3. 是否进 sitemap：只收公开稳定路由，改 `src/lib/sitemap-data.ts`；后台等例外路由在 `robots.txt` 显式排除。
4. 新文件若进收录清单会吃软著材料窗口容量——改完立刻跑 `node tools/软著材料生成.mjs`，看 `assertWindowFit()` 是否放行。
5. **已裁决待实施（2026-11-05）**：新增前台"关于"页 `/about`（P1，静态生成，D31）。内容三段——个人简介 / 技术栈 / 联系方式；
   进 sitemap 与前台导航第三项，页脚亦给入口；联系方式走环境变量，未配置显示"待补充"、不虚构（与合规位同一规矩，D19）。
   实施须同步：新增 `src/app/about/page.tsx`、`src/lib/routes.ts` 归属判定、`src/lib/sitemap-data.ts`、`SiteNav`/`SiteFooter`，
   以及 SPEC 的 F19 追溯行；齐备 `id="main"`、`aria-current`、`generateMetadata` 三项才算完成。实施完成后本行改记实测结果。

### 新增一个 Server Action
1. 动作第一行必须是 `requireAdminSession()`（三处判定共用入口，D21）；"存在会话"不等于放行。
2. 参数先过 `parseInput`，失败回 `redirect(?error=VAL_001&field=<字段>)`；结果统一走 URL 参数，可截图留证（D14）。
3. 来自 URL 的 id 拼进回跳地址前必须过 `ID_PATTERN`；`projectId` 之类外键先校验存在性，别让 P2025 变 500（D26）。
4. 新错误码写进 `src/lib/error-text.ts`，后台横幅经 `errorCodeChip()` 过滤——未知码不打成标签（D28）。

### 新增一个环境变量
1. 三处同步：应用读取点、`.env.example`、`.env.production.example`。
2. 生产要能进容器：在 `docker-compose.prod.yml` 的 `app.environment` 里显式列出——`--env-file` 只参与插值、不注入容器（I024 踩过）。判断"未配置是否合法"：合法用 `${VAR:-}`，必须配置用 `${VAR:?}` 并进 preflight。
3. 值由我本人填进 `.env` / `.env.production`；AI 不读真实值、不复述内容，只报键名与存在性/长度。

### 新增一个依赖
1. 先停下报批：用途、许可证（GPL/AGPL 一律拒）、`npm install --dry-run` 的新增包数与被删条目。
2. 批准后安装，装完立刻在 linux 容器里重算锁文件（I018 会复发），并同步 `src/lib/licenses.ts` 与 `tests/licenses.test.ts`。
3. 若是 Server Component 用到的依赖、且内部有 Turbopack 解析不到的懒加载 `require`，按 I022 处置加进 `next.config.ts` 的 `serverExternalPackages`。

## 环境变量总表（键名 · 用途 · 必需性 · 读取点）

散落在各节的环境变量在这里汇总；改环境、排"填了不生效"的故障先看这张表。"必需性"分两档：**必须配置**
（缺失即功能不可用或启动失败）与**可选**（缺失时按既定行为降级，如整行不渲染）。值一律由我本人写进
`.env` / `.env.production`；AI 只核对键名与存在性、长度，不复述值（见"合规与安全红线"）。

| 键名 | 用途 | 必需性 | 主要读取点 | 模板位置 |
|---|---|---|---|---|
| `DATABASE_URL` | Prisma 连库串 | 必须 | `prisma/schema.prisma`、`src/lib/db.ts` | 两份 `.env*.example` |
| `NEXTAUTH_URL` | 对外站点地址；同时是站点 URL 单源（`src/lib/site.ts` 复用） | 必须 | `src/auth.ts`、`src/lib/site.ts` | 同上 |
| `NEXTAUTH_SECRET` | JWT 会话签名密钥（≥32 位） | 必须 | `src/auth.ts` | 同上 |
| `ADMIN_PASSWORD` | 后台唯一准入口令（非空且 ≥12 位） | 必须 | `src/lib/admin-password.ts` | 同上 |
| `OSS_REGION` | OSS 地域 ID，必须是 `oss-cn-beijing` 形式（写 `cn-beijing` 会拼出不存在的域名） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_BUCKET` | OSS 桶名（`laity-archive`） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_ACCESS_KEY_ID` | RAM 子账号 AK（策略只授 `oss:PutObject`） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_ACCESS_KEY_SECRET` | RAM 子账号 SK | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `SITE_ICP` | ICP 备案号 | 可选（未配置整行不渲染） | `src/app/layout.tsx` → prop 传页脚 | `.env.production.example` |
| `SITE_POLICE_ICP` | 公安备案号 | 可选（同上） | 同上 | 同上 |
| `SITE_CONTACT_EMAIL` | 对外联系邮箱 | 可选（同上） | 同上 | 同上 |

- 新增一个环境变量的标准动作见「常见变更操作手册 → 新增一个环境变量」；生产要能进容器，必须在
  `docker-compose.prod.yml` 的 `app.environment` 显式列出——`--env-file` 只参与插值、不注入容器（I024 踩过）。
- 判"未配置是否合法"：合法用 `${VAR:-}`（三个 `SITE_*`），必须配置用 `${VAR:?}` 并进 preflight 清单（D12）。
- **已废弃，勿再用**：`GITHUB_ID` / `GITHUB_SECRET` / `ALLOWED_GITHUB_IDS`——随 D20 取消 GitHub 登录一并退出，
  CI 里也已在 `d7959bf` 删除，见到别加回。

## 已知坑速查（踩过的，别再踩）

| 场景 | 现象 | 处置 | 来源 |
|---|---|---|---|
| Windows 装包 | linux 平台 `@emnapi/*` 条目被静默删掉，`npm ci` 红 | 在 `node:24-slim` 容器里 `--package-lock-only` 重算 | I018 |
| MSYS 路径改写 | `docker -w /w` 变 `W:/`、`openssl -subj /CN=` 被吞 | 命令前加 `MSYS_NO_PATHCONV=1` | 环境实况 |
| Node 的 `/tmp` | 指的是 `D:\tmp`，不是 Git Bash 的 `/tmp` | 临时产物写仓库内 `tmp/`（已 gitignore、排除 lint） | I039 |
| 管道尾取退出码 | `\| head` 让退出码变 SIGPIPE 假红 | 输出重定向到文件后再判 `$?` | 环境实况 |
| 长跑进程输出 | `npm run dev > tmp/dev.log` 自激、整页重载 | 标准输出写到仓库外 | I048 |
| 正则 source 喂 HTML 属性 | 表单静默不提交（`pattern` 按 `v` flag 编译，尾随 `-`、双反斜杠都非法） | lib 里存"源串单源"，服务端 `RegExp` 派生，加两侧一致测试 | I060 / D26 |
| 对象名安全断言 | 断言把 `toISOString()` 生成的键自己拒了；白名单又放行 `../` | 键生成与断言拆到 `src/lib/object-key.ts`，逐段判、禁空段/`.`/`..` | D27 |
| Server Action 文件参数 | `formData.get("file")` 跨 RSC 边界后是 **Blob** 不是 File | 按 Blob 判并显式拒零字节 | D27 |
| 软著材料窗口 | 普通改动就可能顶破窗口容量（真实容量按整页折算，非 1500 行） | `assertWindowFit()` 拒出件，按其建议调整分带；改完必重出并提交 | I034-补2 |
| 合规位变量 | 填了 `.env.production` 页脚也不显示 | 在 `docker-compose.prod.yml` 的 `app.environment` 显式列出 | I024 / D19 |
| 开发容器被连带删除 | 生产预演 `down -v` 删掉了同名的开发容器 | 生产编排顶层写 `name: laity-prod` | I043 |
| 文档数据与代码实际不符 | 文档里的数字/版本/口径看着有效，实则已漂（如回归测试写"48 条"而实跑 73 条、归档 README 写"决策到 D29"而已有 D32、README 写 `npm install` 而门禁口径是 `npm ci`） | **每次发版前必须用 `npm test` 等实际输出核对文档中的数字与命令**，不靠记忆与上一版；被取代的旧口径在 DESIGN「零·补」裁剪地图里集中登记 | I071 / D32 |

## 术语表（统一叫法，避免同一件事三个名字）

| 术语 | 含义 | 不要写成 |
|---|---|---|
| 档案条目 | 一个项目在索引大厅里的展示单元（Project） | 卷册 / 卷宗 / 卡片 |
| 开发日志 | 一条 Before/After 复盘（Log） | 博客 / 文章 / 帖子 |
| 索引大厅 | 首页 `/` | 主页 / 落地页 |
| 日志大厅 | `/logs` | 列表页 |
| 存证 / 内容摘要 | 发布时按 D5 口径算出的 SHA-256，页面印章展示 | 防伪认证 / 区块链存证（对外措辞见红线） |
| 草稿 | `isPublished=false` 的日志，前台一律不可见 | 未发布 / 私密 |
| 下架 | 只翻 `isPublished`，保留历史摘要与时间（D9） | 删除 |
| 彻底删除 | 正文、摘要、时间一起移除、不可逆（需回填 slug） | 下架 |
| 归属 | 页面/路由属于前台还是后台（`src/lib/routes.ts`） | 权限 |

## 开工与交付自检清单（照着打勾，别靠记性）

### 开工前（每次会话开始）
1. 读本文件全文（事实基座）；与代码/现实冲突时以现实为准并报告冲突点，不自行抹平。
2. 查 ISSUES.md「台账概览 → 未结项速览」，看有无与本次任务相关的历史遗留。
3. 涉及结构或取舍读 DESIGN.md 的 D 编号，涉及行为边界读 SPEC.md 的 F 编号。
4. **写 Next.js 代码前先读 `node_modules/next/dist/docs/` 的对应指南**（版本红线，优先级最高）。
5. 复述本次范围与允许触碰的文件清单，等我确认后再动手。
6. 涉及外部动作（云控制台、服务器、推送、口令轮换）的，只出带判据的步骤清单，不代执行。

### 交付前（每次给出产物之前）
1. **四道门禁全 0**：`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm test`；命令与真实输出一起贴，没跑写"未验证"。
2. **视觉铁律自查**：grep 产出，命中 `rounded-`（非 `rounded-none`）、`shadow-`（非 `shadow-none`）、`bg-gradient`、图标库 import 一律自行返工。
3. **动过软著收录内的文件**：跑 `node tools/软著材料生成.mjs`，看 `assertWindowFit()` 是否放行；通过则重出两份 HTML 一并提交。
4. **凭据扫描**：产出物逐行扫凭据形态；先用注入的伪凭据验证扫描器有效，再采信"未见凭据"的结论。
5. **交付形态**：完整路径 + 完整文件内容，不留片段。
6. **如实标注**：未实测的项标"未验证"并写清缺哪一步；不用推断补全。
7. **范围外发现**：记 ISSUES.md，不动手改。
8. 末尾附 100 字以内研发日志素材（决策/坑/解法）。

## 工作方式（对 AI 的行为要求）

- 遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md 的五层防线与门禁流程
- 每个任务开工先复述范围与允许触碰的文件清单，等我确认
- 交付：完整路径 + 完整文件内容，不许片段
- 验收：粘贴实际执行的命令与真实输出；没执行的标"未验证"
- 信息不足：最多问 3 个阻塞性问题；能查代码/本文件得到答案的不许问我
- 遇到规格歧义、需改配置或依赖、验收达不成：立即停下问我。
  停下来问是正确行为，不是失败；禁止用编造填补不确定性
- 被安全策略拦下的动作（停容器、打印疑似凭据、绕过校验的变体命令）不重试、不换写法绕：
  该结论就如实标"未实测"，并给出一个不依赖该结论也能成立的设计（例如 CI 直接配一次性数据库，
  而不去赌"构建期不查库"）。
- 外部系统动作（云控制台、服务器、证书、口令轮换、推送）只能我本人执行。AI 负责给出
  带判据的步骤清单，判据不成立的步骤不许宣布完成。
- 本文件与代码/现实冲突时：以现实为准并报告冲突点，改本文件需我点名授权。
- 每次交付末尾附 100 字以内研发日志素材（决策/坑/解法），由我存入 docs/01-研发日志