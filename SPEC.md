# SPEC：Laity 项目档案库需求规格（V1.0 单人版）

作者：张磊
创建日期：2026-10-30
重写日期：2026-11-05（按负责人点名重构文档体系，与 DESIGN.md 同轮重写）
状态：V1.0 定稿（冻结口径）；「门禁 2」按负责人指示暂保留
上游：AGENTS.md（事实基座）；下游：DESIGN.md
维护留痕：
- 2026-10-30 初版；2026-11-02 起按实现多轮修正（I028/I029/I031、D25/D26 收口）；
  2026-11-05 上午新增追溯矩阵、错误码总表、状态生命周期与外部差异清单。
- 2026-11-05 按负责人点名"重写 SPEC 与 DESIGN"：全文重组为九节。严格界定 V1.0 单人版范围为
  **F01–F18**，F19（/about，D31 已裁决）单列为"已裁决待实施"、不混入冻结范围；把历史草稿
  （`docs/archive/deprecated-drafts/` 两份 docx 与原型 HTML）中**符合单人形态但此前遗漏**的需求
  整合进对应条目并标「草稿整合」；数据模型补「写入者 / 可否手填」表与状态机转移规则表，使
  `publishedAt` 与 `contentHash` 的语义无歧义；回归测试数按实测由 48 改为 **73**；原§九（待裁决）
  与§十（裁决）合并为「外部设计差异与裁决（已闭环归档）」并新增 C9/C10 两条形态冲突条目；
  新增「冻结状态与变更规则」节。既有 F 编号一律未重排。
- 2026-11-05 同日第二轮（负责人点名"F19/D31 状态同步，一次性改到位"）：`/about` 实施完成，F19 由
  "已裁决待实施"改记**已实施**并补"实施细节见 D31"，小节标题随之改为「已实施增补」；追溯矩阵 F19 行、
  路由表 `/about` 行、第八节 C1 裁决、第九节第 1 条的开放项表述同步——现只余 C2/D30 的剩余令牌切换待批准
  （方案在 `docs/00-开发方法论/D30-剩余令牌切换方案.md`）。实测判据入表：构建路由 `○ /about`、
  浏览器 hydrated DOM 三条判据通过、`npm test` 73/73。既有 F 编号与其余条目未改动。
- 2026-11-05 同日第三轮（负责人点名"D30 方案批准，A 阶段逐步执行，本轮只做 A1"）：第八节 C2 行与
  第九节第 1 条改记 **A1 已落**（主墨 `#131313` → `#1a1a18`），并写入四条裁定——`--ink-2` 与数据色不引入、
  `--rule-strong` 不用于按钮边框、A2/A3/A4 待逐步执行、B1 已批准待做。其余条目未改动。
- 2026-11-05 同日第四轮（负责人点名"A2：只改 `--color-ink-soft`，去掉回退字面量"）：第八节 C2 行与
  第九节第 1 条改记 **A2 已落**（辅助灰 `#5c5c5c` → `#625d53`，实算 5.81:1 与 D30 表一致；
  `blockquote` 的 `var(--color-ink-soft, #5c5c5c)` 回退值整个移除）。本文件的功能条目与契约未受影响——
  A1/A2 只动颜色值，不改任何 F 条目的行为定义。其余条目未改动。
- 2026-11-05 同日第五轮（负责人点名"A3 批准；`proxy.ts` 的 `#E7E7E2` 必须与 `--color-hairline` 同批落；
  层间区分度 2.66 记入 A4 验收项、A3 不动它"）：第八节 C2 行与第九节第 1 条改记 **A 阶段色值已切完**
  （极细线 `#e7e7e2` → `#d9d2c5`，实算 1.33:1，按 I073 豁免不作门槛）；F 条目与契约同样未受影响。
  余 A4/B1。其余条目未改动。
- 2026-11-05 同日第六轮（负责人点名"A4 批准，起 dev 做层间区分度实测；不通过就只挂 ISSUES 给你裁定"）：
  第八节 C2 行与第九节第 1 条改记 **D30 已实施**（A 阶段四色 + A4 实测）；A4 只动文档与材料，
  **未改任何色值、未 revert A2**——实测判据是"现有内容通过、`.log-body blockquote` 场景未被内容触发"，
  故该场景按你的指令单独挂 **I075 OPEN** 待裁定。F 条目与契约不受影响。

已确认的三项决策（2026-10-30）：
1. 后台登录：NextAuth + GitHub OAuth，仅允许我本人的 GitHub 账号；
   修订（2026-11-04，我点名"先取消 github 登录"）：改为 NextAuth Credentials 单一管理员口令
   （`ADMIN_PASSWORD`），理由与代价见 DESIGN.md 的 D20；F04 与 `/api/auth/*` 两行按此改。
2. 生产部署：自有服务器 Docker + Nginx + SSL；
3. 本地环境近期安装，Phase 1 即为可运行的最小真闭环，不走降级骨架。

---

## 一、范围界定与形态边界

本规格只描述 **V1.0 单人档案库**。三项硬边界（与 AGENTS.md、DESIGN「历史决策裁剪说明」一致）：

1. **无注册、无多用户**：访客只读；后台唯一准入是 `ADMIN_PASSWORD` 一把口令（D20）；
   数据模型无 `User` 表、无 `userId`、无租户概念。
2. **无 UGC**：所有内容仅由作者本人经后台录入并发布；不提供评论、投稿、举报等任何第三方参与面。
3. **V2.0 多用户 SaaS 归档搁置**：邮箱注册、手机验证码、租户隔离、GitHub 同步、付费订阅等
   全部不在本规格范围，也不得出现在对外文案里（原方案存 `docs/archive/Laity合规需求设计方案.md`，
   演进边界见 DESIGN「历史决策裁剪说明」与 Phase 9）。

### 非目标清单（V1.0 坚决不做）

1. 不做面向公众的注册/登录——访客只读，无任何账号体系；
2. 不做富文本所见即所得编辑器——Markdown 双栏纯文本足够；
3. 不做日志版本历史/回收站——git 与数据库备份承担该职责；
4. 不做移动端 App/小程序——响应式 Web 覆盖；
5. 不做评论、点赞、全文搜索、RSS、国际化——个人档案库无此需求，做了徒增攻击面；
6. 不做 GitHub API 自动锚定 commit 数——数据模型不为此加字段，日志页不展示 commits 统计
   （历史草稿 Mock 中的 ⏱/commits 属装饰数据，仅保留可由 beforeDate/afterDate 直接计算的时长）；
7. 不做访问统计/埋点——上线后视需要另立需求；
8. 出自历史草稿、经 2026-11-05 裁决不实现的项：`SiteConfig` 站点配置表、Project 的
   `demoUrl`/`startDate`/`updatedAt` 与 `kind=research`、`onDelete: Cascade` 级联删除、
   `lessonLearned` 发布必填、Next Image 组件、Lighthouse 与首屏性能指标、
   Person/BlogPosting 结构化数据（逐条见第八节 C3–C8）。

## 二、功能清单（V1.0 冻结范围：F01–F18）

### P0（首批交付必须，缺一不可上线）

| 编号 | 用户故事 | 说明 |
|---|---|---|
| F01 | 作为访客，我能浏览首页，以便快速了解厂牌定位与当前状态 | 大标语、状态看板（项目名/类型/状态/日期）、精选项目、最新日志。看板含零日志项目并显示"尚未发布"，**不拿创建时间冒充更新时间**（草稿整合）；精选规则=有已发布日志的项目按最近发布时间取前三（D13）；最新三条由数据库 `take: 3` 取数，不再全表捞回内存（D28） |
| F02 | 作为访客，我能浏览日志大厅，以便按项目和标签筛选复盘记录 | 双层筛选（项目、标签）经 URL 参数传递、筛选后的链接可直接分享（草稿整合）；左侧 200px BEFORE/AFTER 时间轴——1px 竖线贯穿，实心节点=已完成、空心节点+"进行中"=无 afterDate；移动端时间轴折叠为单行、不压缩成不可读小字（草稿整合）；筛选无命中给"清除筛选"出口；空状态显示"暂无开发日志"，不留空白占位（草稿整合） |
| F03 | 作为访客，我能阅读日志详情，以便看到完整的判断与验证过程 | 限宽 720px、宋体 18px / 行高 1.85；内容顺序固定：所属项目 → 标题 → 双时间轴 → 标签 → BEFORE → AFTER → LESSON LEARNED → 内容摘要区（草稿整合）；摘要区等宽小字展示 `CONTENT HASH`（小写十六进制 SHA-256）与 `PUBLISHED AT`（UTC）；**措辞技术中性**——只用"内容摘要"，禁用"防伪认证/不可篡改/法律效力"（草稿整合，D19）；已发布但缺摘要或发布时间时显示显式告警块"摘要缺失，请在后台重新发布以补齐；补齐前本页不构成内容未被篡改的证明"，**不静默省略印章** |
| F04 | 作为管理员，我能用后台口令登录，以便安全地管理内容 | 口令只存服务器环境变量；比对方式为两侧各取 SHA-256 后 `timingSafeEqual`；未配置或输入为空一律拒绝，且**"未配置口令"与"口令错误"表现完全一致**、公开页不透露配置状态（草稿整合）；失败回 `/login?error=CredentialsSignin`；会话为签名 JWT，有效期显式 12 小时（D25）；登录限速两层——nginx `limit_req`（rate=5r/m、burst=5）+ 应用进程内节流（10 分钟窗口 5 次失败），来源键由边缘覆写 `X-Forwarded-For` 保证可信（D21/D22） |
| F05 | 作为管理员，我能新建/编辑日志，以便记录 BEFORE 判断与 AFTER 验证 | 双栏 Markdown 编辑器（左编辑右实时预览）；可存草稿（`isPublished=false`）；被服务端拒绝的保存不丢正文——`VAL_001` 带 `&field=` 定位到具体控件 + 两份正文经 `sessionStorage` 暂存回填（D26） |
| F06 | 作为管理员，我能发布日志，以便内容带着存证公开 | 「保存并发布」**先把这张表单的正文写入库，再按库里刚存下的内容**算 SHA-256 写入 `contentHash`、记服务器时间 `publishedAt`（D25：所见即所发）；三时间字段分工——`beforeDate`/`afterDate` 作者手填、`publishedAt` 由服务器写入且**任何表单都不采集它**（草稿整合）；已接受的边界：发布被拦（如 `LOG_003`）时正文已保存为草稿 |
| F07 | 作为管理员，我能管理项目（增改删），以便日志有所归属 | 删除挂有日志的项目必须被拒绝（`PRJ_001`）；删除两步生效，缺二次确认位回 `PRJ_003`；项目已被并发删除回 `PRJ_004`，**不得把"没删到任何行"报成删除成功**（D26） |
| F08 | 作为访客，我绝看不到未发布内容，以便草稿与公开严格隔离 | 前台一切查询强制走 getSafeLogs 类封装（内部强制 `isPublished: true`，页面代码无法绕过）；未发布与不存在的 `/logs/[slug]`、`/projects/[slug]` 由 Proxy 前置返回**真 404 状态码**（不是 200 + 错误页），响应头带 `noindex` 与 `no-store` 防搜索引擎收录草稿（D7，草稿整合）；请求里的 slug 不拼进 HTML |
| F09 | 作为管理员，我发布的 Markdown 不会引入 XSS，以便站点安全 | 渲染必过 rehype-sanitize，唯一出口 `src/lib/markdown.tsx`（禁止页面自行拼装渲染器）；禁止 `dangerouslySetInnerHTML` 裸渲染；CSP 静态头作第二层（`object-src 'none'`、`frame-ancestors 'none'`、`base-uri`/`form-action 'self'` 全卡死，D29） |

### P1（后续 Phase，不阻塞上线）

| 编号 | 用户故事 | 说明 |
|---|---|---|
| F10 | 作为管理员，我能上传图片得到 OSS 外链，以便正文插图不落服务器本地 | Server Action 转发阿里云 OSS；类型按**文件内容签名**（PNG/JPEG/GIF87a/GIF89a/RIFF…WEBP 的 magic bytes）判定，不信任浏览器上报的 MIME 与文件名；拒零字节与超 5MB；对象名完全由服务端生成 `logs/<YYYY-MM>/<UTC 时间戳>-<12hex>.<ext>` 并逐段断言（空段/`.`/`..` 全拒、必须落在 `logs/` 前缀下）防目录穿越；RAM 子账号仅 `oss:PutObject` 且资源限定 `logs/*`，无删除无列举；服务器本地不落盘；遗留对象由存储桶生命周期规则清理，应用不提供删除接口（草稿整合） |
| F11 | 作为访客，我能浏览项目列表与项目详情，以便按作品维度看档案 | /projects、/projects/[slug]；公开口径 = 查询层显式 `select` 字段白名单 + 只统计已发布日志（D10）；不存在的 slug 返回真 404；项目详情页作为**下钻页不出现在全局导航**，顶部给「← 返回索引大厅」退路，不破坏导航层级（草稿整合） |
| F12 | 作为访客，我在任何页面都知道自己在哪、怎么走去别处，以便把本站当正常网站使用 | 前台持久导航（字标 = 首页 + 开发日志 + 作品档案）、当前页 `aria-current="page"`、「跳到正文」跳转链接、正文容器 `id="main"`、筛选无结果时给"清除筛选"出口；键盘焦点统一 `:focus-visible` 2px 实线且全站唯一一套；后台与登录页不叠加前台导航、使用独立布局（草稿整合）；桌面/平板/手机三档断点均无横向滚动（草稿整合）；未配置的个人信息显示"待补充"、不虚构（草稿整合）。`/about` 实施后导航同步扩为三项（见 F19） |
| F13 | 作为搜索引擎/分享方，我能拿到规范的站点信息，以便收录与预览卡片正常 | 每页 `title`/`description`（详情页标题跟随内容、描述优先取"经验总结"）、`metadataBase` + Open Graph + Twitter card、`/robots.txt`（屏蔽 /admin、/login 与 /api）、`/sitemap.xml`（只含公开稳定路由与已发布内容，请求期取数） |
| F14 | 作为站长，我需要一个不依赖登录的健康检查端点和一个诚实的错误页，以便上线后能判断"是站点挂了还是数据库挂了" | `/api/health` 返回 `{status, db}`，数据库不可达时 503 且不泄露任何异常细节；必须请求期执行（加 `await connection()`），否则会被预渲染成一个永远不会变的"ok"、成为会说谎的探针（D17）；未匹配路由走品牌化 404；渲染异常走可重试的错误边界且不显示内部路径与参数 |
| F15 | 作为访客，我想知道这个站拿了我什么、存了什么、怎么删，以便本站满足上线合规要求 | `/privacy` 隐私与数据说明页（**按当前实现逐条写，不承诺做不到的事**）；页脚提供入口与 ICP 备案号位；ICP 备案号、公安备案号、对外联系邮箱三项走环境变量，**未配置则整行不渲染，不用占位文案假装合规**（草稿整合） |
| F16 | 作为管理员，发布前我想知道正文里有没有不便公开的东西（手机号、密钥、内网地址等），以便避免误发布 | `src/lib/sensitive-scan.ts` 纯函数在**服务端发布时**执行，绕过前端提交同样生效（草稿整合）；九类形态：手机号、身份证号、云厂商 AccessKey、GitHub 令牌、私钥块、JWT、明文口令赋值、内网 IP、邮箱（提示级不阻截发布）；数字形态类按词元匹配并整体跳过长度 ≥16 的十六进制串以免误判 contentHash，跨标点形态全文匹配；命中阻截级且未勾选「已核对，仍要发布」时发布返回 `LOG_003`；扫描对象是**库里将要公开的正文**，不是表单声称的值 |
| F17 | 作为作者，我要能把一条日志彻底删掉，以便行使对自己数据的删除权 | `deleteLog` 动作 + 编辑页"彻底删除"表单，要求原样回填该条 slug 作为确认（不符返回 `LOG_004`）；与"下架"（D9 保留历史摘要与时间、正文不动）并存，两条路径语义各自清楚；OSS 图片对象不随删除走——那把 RAM 密钥只有 `PutObject`，为"删内容即删对象"去扩 `DeleteObject` 是安全性的净损失，交由生命周期规则兜底（草稿整合） |
| F18 | 作为访客，我要能看到本站用了哪些开源组件及其许可证，以便完成第三方致谢与商标声明 | `/licenses` 页 + `src/lib/licenses.ts` 清单；18 个直接依赖的许可值逐个从 `node_modules/<包>/package.json` 实测读出后登记；`tests/licenses.test.ts` 做三件事（依赖漏登记即红、清单里有已删除的依赖即红、许可命中 `GPL/AGPL/LGPL/CC-BY-NC/SSPL` 前缀即红）；含字体致谢与 GitHub 商标声明（草稿整合） |

### 已实施增补（2026-11-05，交付面之内；实施细节见 DESIGN 的 D31）

| 编号 | 用户故事 | 说明 | 状态 |
|---|---|---|---|
| F19 | 作为访客，我想知道站主是谁、用什么技术栈、怎么联系，以便判断是否值得信任与协作 | `/about` 关于页（P1，静态生成）：个人简介 / 技术栈 / 联系方式三段；技术栈只列名称与用途、不写版本号（版本实测值的唯一口径在 AGENTS，抄进页面就多一处会漂的地方）；联系方式中的邮箱走 `SITE_CONTACT_EMAIL`，未配置显示「待补充」、不虚构；进 sitemap 与前台导航第三项，页脚入口沿用既有三项合规位的同一规矩 | **已实施（2026-11-05）**，实施细节见 D31；构建路由表为 `○ /about`（静态生成），浏览器实测三段渲染、`aria-current` 高亮与「待补充」斜体占位均通过 |

## 三、数据模型（Prisma Schema）

唯一事实是 `prisma/schema.prisma`；本节草案与其**逐字段对拍**（实测 2026-11-05 一致）。
出现漂移即本节过期，以 schema 为准并报告冲突点。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  kind      String   // product | tool | site
  status    String   // WIP | LIVE | ARCHIVED
  summary   String?
  repoUrl   String?
  createdAt DateTime @default(now())
  logs      Log[]
}

model Log {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  tags          String[]
  beforeContent String    // Markdown 格式 BEFORE 内容
  afterContent  String?   // Markdown 格式 AFTER 内容，为空表示进行中
  beforeDate    DateTime  // 手填判断时间，表达决策节奏
  afterDate     DateTime? // 手填验证时间，为空表示进行中
  isPublished   Boolean   @default(false) // 草稿隔离标记
  lessonLearned String?   // 列表展示用两行摘要
  publishedAt   DateTime? // 服务器实际发布时间，发布动作写入，不可手填
  contentHash   String?   // 发布时按 D5 口径计算的 SHA-256 摘要
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([isPublished, beforeDate])
  @@index([projectId])
}
```

约定（继承 AGENTS.md）：时间一律 UTC 存储，展示层再做时区转换，禁止存本地时间字符串；
`kind`/`status` 用字符串而非 enum 以降低迁移成本，合法值在服务层校验。
数据模型中**没有 `User` / `Account` / `Session` / `VerificationToken`**——这是 V1.0 单人形态在数据层的
落点；出现任何 User 形态即违反本规格（V2.0 见第八节 C9 与 DESIGN「历史决策裁剪说明」）。

### 3.1 关键字段的写入者与可否手填（无歧义定义）

| 字段 | 由谁写入 | 语义 | 可否手填 |
|---|---|---|---|
| `beforeDate` / `afterDate` | 作者经后台表单 | 表达个人决策与验证的节奏，可自由编辑 | **可** |
| `publishedAt` | 发布动作由**服务器**写入当前 UTC 时间 | 内容实际公开的时刻，存证的另一半 | **不可**——任何表单都不采集它 |
| `contentHash` | 发布动作按 D5 口径计算 | 发布那一刻正文的指纹，存证的一半 | **不可** |
| `isPublished` | 保存 / 发布 / 下架动作翻转 | 草稿隔离开关 | **不可**直接填，只随动作变化 |
| `createdAt` / `updatedAt` | 数据库默认值与 `@updatedAt` | 建行与最后写库时刻；**不得对外当发布时间用** | 不可 |

摘要口径（D5，改动即与历史印章不兼容，禁止"顺手规范一下"）：
`sha256(title + "\n" + beforeContent + "\n" + (afterContent ?? ""))`，UTF-8，小写十六进制。
唯一实现是 `src/lib/content-hash.ts`——运行时、种子脚本、任何复核工具都必须复用它，不允许第二处重算。
**发布动作必须同时**计算摘要写入 `contentHash`、记录服务器时间到 `publishedAt`，两者缺一不可。

### 3.2 状态机（草稿 / 发布 / 下架 / 彻底删除）

```
草稿（isPublished=false）
   │ 发布：saveLog 先写库 → publishLog 按库中正文算 SHA-256 写 contentHash + 记 publishedAt（D25）
   ▼
已发布（isPublished=true，contentHash 与 publishedAt 齐备）
   │                                       │ 下架（unpublishLog：只翻 isPublished，
   │ 编辑并保存                             │   历史摘要与时间保留，正文不动）
   ▼                                       ▼
退回草稿（D9）                      已下架（前台不可见，等价草稿态）
   旧 contentHash/publishedAt 保留为"上次发布"历史，重新发布按当前正文重算并刷新时间

任意状态 ── 彻底删除（deleteLog，回填 slug 确认）──▶ 不存在（正文/摘要/时间一并移除，不可逆）
```

转移规则逐条（`contentHash` / `publishedAt` 的行为是这张表的核心）：

| 转移 | 触发动作 | 对 contentHash / publishedAt 的影响 | 前台可见性 | 可逆？ |
|---|---|---|---|---|
| 新建 / 保存草稿 | `saveLogDraft` | 不计算、不写入 | 不可见 | — |
| 草稿 → 已发布 | 「保存并发布」（先存再发，D25） | 按**库中刚存的正文**计算并写入；时间取服务器 UTC | 可见 | 可（下架或再编辑） |
| 发布被拦（`VAL_001` / `LOG_003`） | 同上 | **不写**（发布步未执行），但正文已保存为草稿 | 不可见 | — |
| 已发布 → 草稿 | 编辑任一已发布日志并保存（D9） | 旧值**保留**为"上次发布"历史，供后台显示"上次发布于何时、哈希是什么" | 不可见 | 可（重新发布按当前正文重算） |
| 已发布 → 已下架 | `unpublishLog` | 只翻 `isPublished`，摘要与时间一律保留 | 不可见 | 可 |
| 任意 → 不存在 | `deleteLog`（回填 slug 确认） | 一并移除 | 不可见 | **不可逆** |

- **前台可见的唯一条件**：`isPublished=true` **且** `contentHash` 与 `publishedAt` 齐备；
  已发布但缺任一项时详情页显示显式告警块而不静默省略印章（存证是本站唯一的差异化卖点，
  静默降级最伤信任）。
- 未发布 / 不存在的 `/logs/[slug]` 与 `/projects/[slug]` 由 Proxy 前置返回真 404（D7），
  不是 200 + 错误页。

### 3.3 项目（Project）状态约定

- `kind` 合法值 `product` / `tool` / `site`；`status` 合法值 `WIP` / `LIVE` / `ARCHIVED`；
  字符串而非 enum，合法值在服务层校验。
- 项目**没有发布开关**：`/projects` 列全部项目（含零日志项目），访客可见字段由查询层显式
  `select` 白名单决定（D10：slug、名称、类型、状态、简介、仓库地址，详情页另加 `createdAt`，
  不返回 `id`）；日志条数与最近日期一律只统计 `isPublished: true`，不走 `_count` 全量。
- 删除前提：项目下无任何日志挂靠，否则 `PRJ_001`。

## 四、接口契约

架构为 Next.js 全栈，写操作统一走 Server Action（不另设 REST 层，D1），页面直读数据库（RSC，D3）。

### 4.1 页面路由

| 路由 | 优先级 | 数据来源 | 说明 |
|---|---|---|---|
| / | P0 | getArchiveBoard + getSafeLogs({ take: 3 }) | 首页：精选区（有已发布日志的项目按最近发布取前三）+ 状态看板（含零日志项目，显示"尚未发布"）+ 最新三条日志（取数交给数据库 `take`，不再全表捞回内存） |
| /logs | P0 | getSafeLogs（支持 project/tag 筛选参数） | 日志大厅；筛选无命中时给"清除筛选"出口 |
| /logs/[slug] | P0 | getSafeLogBySlug（仅已发布） | 详情 + 内容摘要区；未发布 slug 返回真 404；已发布但缺摘要/时间时显式告警，不静默省略印章 |
| /projects、/projects/[slug] | P1 | 项目表 + getSafeLogs | 作品维度；下钻页不进全局导航，带返回退路（D10） |
| /admin | P0 | 需登录 | 后台入口/概览：项目总数、已发布日志数、草稿数、最近改动的日志 |
| /admin/projects | P0 | 需登录 | 项目管理；新建与编辑共用一张表单，删除走两步生效（第一次点击置确认位、第二次才提交，缺确认位回 `PRJ_003`） |
| /admin/logs/new、/admin/logs/[id]/edit | P0 | 需登录 | 双栏编辑器；草稿页在同一张表单里给「保存修改」与「保存并发布」两个动作，已发布日志的编辑页提供「下架」与「彻底删除」；标识不在库里时在**后台外壳内**提示并给"回概览 / 新建"出口（不落到公共 404 页，D28） |
| /login | P0 | 自建页 | 管理员口令登录页与错误提示页（D11、I012-B）；`callbackUrl` 只接受本站相对路径，`//host` 与 `/\host` 形状一并挡掉并回落 `/admin`（D26） |
| /api/auth/* | P0 | NextAuth | 管理员口令登录的 CSRF/回调/退出端点 |
| /robots.txt | P1 | 静态生成 | 放行公开路径，屏蔽 /admin、/login 与 /api，指向 sitemap |
| /sitemap.xml | P1 | getSafeLogs + 项目表（请求期取数） | 只含公开路由（含 /privacy、/licenses）与已发布内容，草稿与 /admin 不出现 |
| /privacy | P1 | 静态 | 隐私与数据说明（F15），进 sitemap 与页脚 |
| /licenses | P1 | 静态 | 开源许可与致谢 + 商标声明（F18），进 sitemap 与页脚 |
| /api/health | P1 | 一次性 `SELECT 1` | 运维探针，与登录无关；no-store + noindex |
| /about | P1（已实施） | 静态 | 关于页：个人简介 / 技术栈 / 联系方式（F19、D31），进 sitemap、前台导航第三项与页脚；联系方式未配置显示「待补充」；构建路由表为 `○ /about` |

### 4.2 Server Actions

| Action | 入参 | 出参 | 错误码 |
|---|---|---|---|
| saveLogDraft | {id?, title, slug, projectId, tags[], beforeContent, afterContent?, beforeDate, afterDate?, lessonLearned?} | {id} | AUTH_001 未登录；VAL_001 参数校验失败并带 `&field=<出错字段>`；LOG_001 slug 重复 |
| publishLog（页面动作 `publishLogAction`，D25） | 整张表单字段 + {id, sensitiveConfirmed?}：先按表单字段执行一次保存，lib 层 `publishLog(id)` 再按**库里刚存下的正文**计算摘要 | {contentHash, publishedAt} | AUTH_001；VAL_001 表单校验失败（此时既不写也不发，带 `&field=`）；LOG_001 slug 重复；LOG_002 日志不存在；LOG_003 正文含疑似敏感信息且未确认（正文已存、未发布） |
| unpublishLog | {id} | {ok} | AUTH_001；LOG_002；id 形状非法（`ID_PATTERN`）时 VAL_001&field=id，不拼进回跳地址 |
| deleteLog | {id, confirmSlug} | {ok} | AUTH_001；LOG_002；LOG_004 确认 slug 与库中不一致，删除未执行 |
| saveProject | {id?, slug, name, kind, status, summary?, repoUrl?} | {id} | AUTH_001；VAL_001 带 `&field=<出错字段>`；PRJ_002 slug 重复；PRJ_004 该项目已被删除（P2025，D26） |
| deleteProject | {id, confirmDelete} | {ok} | AUTH_001；PRJ_001 项目下仍有日志，禁止删除；PRJ_003 缺少二次确认位，删除未执行；PRJ_004 项目不存在（不再当作"已删除"返回成功，D26） |
| uploadImage（P1） | FormData(file)：动作参数跨 React 边界后是 **Blob**（不是 File），按 Blob 判定并显式拒零字节 | {url, bytes} | AUTH_001；IMG_001 内容为空/超 5MB/文件头签名不认/生成的对象名逐段判不通过（D27） |

动作有两种形态（2026-11-02 经我确认，SPEC 原写"统一 `{ok,code,message}`"与实际不符，按实际改，见 I031 / D14）：

- **页面表单动作**（saveLogDraft / publishLog / unpublishLog / saveProject / deleteProject）：
  成功与失败都 `redirect` 回原页，用 URL 参数表达结果——`?saved=1`、`?published=1`、
  `?unpublished=1`、`?deleted=1`、`?error=CODE`；校验类错误再带一个 `&field=<出错字段>`（D26），
  让页面把提示标到那一个控件上而不是复述整张表单的规则。这样结果可复核、可截图留证，
  是 Phase 4 既定验收口径；
- **编辑器内动作**（uploadImage）：调用方要拿返回值插进正文，因此返回对象
  `{ ok: true, url, bytes }` 或 `{ ok: false, code }`。

两种形态都不带 `message` 字段：错误码到用户文案的映射统一收在 `src/lib/error-text.ts`，其中
`VAL_001` 按来源表单（log / project）与 `&field=` 取细则。文案层对未知码仍回落成码本身，
但后台横幅展示时经 `errorCodeChip()` 过滤——只打已收录的错误码，URL 里手填的任意串一律显示
"未收录的错误码"（D28）。每个后台动作的第一行必须是 `requireAdminSession()`
（三处会话判定共用同一入口，D21；"存在会话"本身不构成放行理由）。

## 五、错误码总表

错误码到文案的唯一映射是 `src/lib/error-text.ts`；后台横幅展示前经 `errorCodeChip()` 过滤，
URL 里手填的任意串一律显示"未收录的错误码"（D28）。新增错误码必须同时改：本表、`error-text.ts`、
触发它的动作。

| 错误码 | 触发条件 | 所在动作 | 是否带 `&field=` |
|---|---|---|---|
| `AUTH_001` | 未登录 / 会话非管理员 | 全部后台动作 | 否 |
| `VAL_001` | 表单参数校验失败；id 形状非法（`ID_PATTERN`）也归此码 | saveLogDraft / publishLog / saveProject / unpublishLog | 是 |
| `LOG_001` | 日志 slug 与库中已有重复 | saveLogDraft / publishLog | 是（slug） |
| `LOG_002` | 目标日志不存在 | publishLog / unpublishLog / deleteLog | 否 |
| `LOG_003` | 正文命中阻截级敏感信息且未勾选确认 | publishLog | 否 |
| `LOG_004` | 彻底删除时回填 slug 与库中不一致 | deleteLog | 否 |
| `PRJ_001` | 项目下仍有日志，禁止删除 | deleteProject | 否 |
| `PRJ_002` | 项目 slug 重复 | saveProject | 是（slug） |
| `PRJ_003` | 缺少二次确认位 | deleteProject | 否 |
| `PRJ_004` | 项目不存在（P2025，不再当"已删除"返回成功，D26） | saveProject / deleteProject | 否 |
| `IMG_001` | 图片为空 / 超 5MB / 文件头签名不认 / 生成对象名逐段判不通过 | uploadImage | 否 |

成功回执走 URL 参数（可截图留证）：`?saved=1`、`?published=1`、`?unpublished=1`、`?deleted=1`。

## 六、需求到实现的追溯矩阵

每条需求都要能回答"靠哪条决策实现、落在哪个文件、用什么证据验收"。本表是防止"实现缺项"
（I028 那类）的常备对照，新增或变更需求时同步维护；**空着"证据"一栏的条目等于尚未验收**。

| 需求 | 关键决策 | 主要落点 | 验收证据 |
|---|---|---|---|
| F01 首页 | D13、D28 | `src/app/page.tsx`、`projects.ts:getArchiveBoard` | 精选规则生效 + 看板含零日志项目显示"尚未发布" + 首页 `take: 3` 顶层导航复核通过 |
| F02 日志大厅 | D3 | `src/app/logs/page.tsx` | 双层筛选经 URL 参数、可分享；两个筛选维度互不丢弃（`logsHref` 同时带两参数） |
| F03 日志详情 | D5、D19 | `logs/[slug]/page.tsx`、`Seal.tsx` | 印章哈希独立重算逐字一致；缺摘要显式告警；访客可见文案"存证/防伪"curl 计数为 0 |
| F04 后台登录 | D20、D8、D11、D12、D21、D22 | `src/auth.ts`、`admin-password.ts`、`/login` | D20 三条分支本机实跑（正确口令进 /admin 渲染"管理员"、错口令 401 不发 cookie、无会话 307 到 /login）；nginx 限速一次性容器实测 `200×6 → 429×6` |
| F05 新建/编辑日志 | D4、D9、D26 | `admin/logs/*`、`Editor.tsx` | 草稿前台不可见；已发布日志保存即退回草稿；11 个标签被拒后 BEFORE 正文完整回填、暂存键已清 |
| F06 发布存证 | D5、D25 | `publish.ts`、`log-actions.ts` | D25 正向判据：正文由 A 改 B 后**一次保存都不点**直接发 → 前台含 B 不含 A，页面摘要与按 B 独立重算一致、与按 A 重算不一致 |
| F07 项目管理 | D26 | `admin/projects`、`project-actions.ts` | PRJ_002 / PRJ_003 / PRJ_004 各有实测分支（PRJ_003 服务端分支在**自建临时项目**上验，不指向真实项目） |
| F08 草稿隔离 | D7、D10 | `logs.ts:getSafeLogs`、`proxy.ts` | 直访草稿返回真 404（非 200 + 错误页）；线上重跑同一条 |
| F09 XSS 防护 | D4、D29 | `markdown.tsx`、CSP（`next.config.ts`） | 含 `<script>alert(1)</script>` 的日志渲染后无脚本执行 + 浏览器全程 0 条 CSP violation |
| F10 图片上传 | D27、I022 | `oss.ts`、`object-key.ts`、`upload-action.ts` | 70 字节真图两次上传均回直链、`<img>` 加载 `naturalWidth=1`；伪造 MIME 的 .exe 与文件头不完整一律 IMG_001；服务器本地无落盘 |
| F11 项目维度页 | D7、D10 | `projects/*`、`proxy.ts` | 不存在 slug 返回 404；只有草稿的项目 200 且显示"NO LOG YET" |
| F12 导航与可达性 | D16、D24、D26 | `SiteNav.tsx`、`routes.ts`、`globals.css` | 键盘可达（文档序首个可聚焦元素是 `#main` 跳转链接）、`aria-current`、CSSOM 里 `:focus-visible` 恰一条规则、三档断点无横向滚动 |
| F13 SEO 与抓取 | D16、D29 | `sitemap.ts`、`robots.ts`、`generateMetadata` | sitemap 只含已发布内容；真 404 带 noindex + no-store |
| F14 健康检查 | D17、D18、I036 | `api/health/route.ts` | 拔库 503 `{"db":false}`、恢复 200；探针表达式经桩服务器五路自检（恒返回 0 的探针比没有更坏） |
| F15 合规页 | D17、D19 | `/privacy`、`SiteFooter.tsx` | 未配置的合规位整行不渲染；`docker compose config` 核对三项确实进容器 |
| F16 敏感信息门 | D19 | `sensitive-scan.ts` | 九类形态命中 + 三类反例（64 位摘要、40 位提交号、版本号）零命中（`npm test`）；阻截级未确认 `LOG_003` 拒发、勾选后 `?published=1` |
| F17 删除权 | D19 | `deleteLog` | 回填 slug 不符得 `LOG_004` 且删除未执行；删除后该 slug 前台 404 |
| F18 开源许可 | D19 | `licenses.ts`、`/licenses` | 与 package.json 对拍通过、许可值来自 `node_modules` 实测、无传染性许可 |
| F19 关于页 | D31 | `app/about/page.tsx`（新增）、`sitemap-data.ts`、`SiteNav.tsx`（`routes.ts` 经实测无需改，黑名单制下 `/about` 天然公开） | **已实施（2026-11-05）**：`id="main"`、`generateMetadata`、`← 返回首页` 齐备；浏览器 hydrated DOM 实测「关于」项 `aria-current="page"` 且计算色为墨色实线边框、未配置邮箱时「待补充」以 `font-style: italic` 渲染且页面 `mailto` 链接数为 0；`/about` 进 sitemap；构建路由表 `○ /about` |

## 七、上线基线（工程与合规）

| 项 | 要求 | 现状 |
|---|---|---|
| 回归测试 | 纯逻辑必须有可重复运行的测试：D5 摘要口径、图片内容签名、slug 与表单取值、错误码文案完整性、时间展示、路由归属判定、发布前敏感信息形态、开源许可清单与红线、口令判定与节流桶回收、对象名断言 | `npm test`（Node 自带 test runner，零测试依赖），**73 条断言全绿（2026-11-05 实测）**；DB 层与需登录的动作层不在覆盖内，那部分靠 `docs/02-测试记录/` 的自测表与人工联调，不能用测试全绿代替 |
| 构建门禁 | `npm run lint`、`npx tsc --noEmit`、`npm run build` 必须全 0 才算可发版 | 全 0 |
| 健康检查 | 提供与登录无关的 `/api/health`，能区分"进程活着"与"数据库连得上"，异常不外泄细节 | 已实现，实测库停止时 503 `{"status":"degraded","db":false}`、恢复后 200；生产编排的 app 探针已改打这一条并校验响应体 `db === true`（I036），`web` 等 `app` healthy 再起 |
| 持续集成 | 四条门禁不能只靠人记得跑（I037） | `.github/workflows/ci.yml`：`npm ci` → `prisma generate` → lint → tsc → test → `prisma migrate deploy` → build → 软著材料两步自检（漏登记新文件、HTML 与说明书不同步都会红）。配一次性 `postgres:16` 服务，因为"构建期是否查库"本机未能实测；工作流 env 全为占位值。Actions 首跑已确认（run 41752295295 @ d8ced9c，completed/success，14 步全绿，耗时 2m07s） |
| 错误处理 | 未匹配路由有品牌化 404；渲染异常有可重试的错误边界且不显示内部信息 | `src/app/not-found.tsx`、`src/app/error.tsx`（后者有意不接收 `error` prop：异常文本可能带内部路径与参数） |
| 合规位 | 隐私与数据说明页按真实行为撰写；ICP 备案号、公安备案号、对外联系邮箱三项走环境变量，未配置就不渲染该行，不硬凑文案 | `/privacy`、`/licenses` 已上线；`SITE_ICP` / `SITE_POLICE_ICP` / `SITE_CONTACT_EMAIL` 待我本人填入。**注意**：这三项必须在 `docker-compose.prod.yml` 的 `app.environment` 里显式传——`--env-file` 只参与插值、不注入容器，此前就漏了导致填了也不显示（I024） |
| 发布前把关 | 正文里若出现手机号、身份证号、云厂商/GitHub 凭据形态、私钥块、JWT、明文口令赋值、内网地址，发布需显式确认（`LOG_003`） | `src/lib/sensitive-scan.ts` 纯函数 + 编辑页命中清单 + 确认勾选；邮箱只提示不拦发布（联系方式常是故意公开的，拿它拦只会逼人关掉整个功能）。误报可确认放行，判定本身可单测 |
| 删除权 | 作者能彻底删除某条日志，且不可逆操作要有实质量确认 | `deleteLog` + 回填 slug（`LOG_004`）。图片对象不随之删除：那把 RAM 密钥只有 `PutObject`，刻意不扩权限，遗留对象交给存储桶生命周期规则 |
| 对外口径 | 哈希只是可核对的技术标记，对外文案不暗示法律效力或"存证服务"；对内注释、SPEC 与软著材料保留"证据链"叙事（D19 措辞分界） | 已按此边界改完 `site.ts`、`layout.tsx`、`Seal.tsx`、`logs/page.tsx`、`logs/[slug]/page.tsx` 的访客可见文案 |
| 应急预案 | 有一份写清"本站到底有什么可泄露"、止血顺序与入侵时不原地清理的预案 | `docs/00-开发方法论/个人信息与凭据泄露应急预案.md`。单人站无第三方用户，不照抄平台型预案的 72 小时通知承诺 |
| 部署与回滚 | 有一份可照着做的上线/回滚手册，含迁移镜像标签必须刷新这一条（I026） | `docs/00-开发方法论/上线与回滚手册.md` |
| 安全头与传输 | TLS 1.2/1.3、HSTS、`nosniff`、`X-Frame-Options`、CSP、后台与 404 禁止索引 | nginx（前四项）+ `next.config.ts`（CSP 静态头与 `poweredByHeader: false`，D29：nonce 方案与 PPR 不兼容，走官方"Without Nonces"路径）。本机实测：CSP 头就位、浏览器全程 0 条 violation、`X-Powered-By` 不再透出 |

## 八、外部设计差异与裁决（已闭环归档，本节不再变化）

来源：历史草稿《Laity 数字档案库 · 最终优化设计方案》《最终整合设计方案》
（`docs/archive/deprecated-drafts/`）、配套原型 HTML，以及《Laity 多用户开发者档案库 合规需求设计方案》
（均在 `docs/archive/`，边界声明见 `docs/archive/README.md`）。

**处理原则**：草稿中符合单人形态、此前遗漏的需求已整合进第二节对应条目并标「草稿整合」；
与现行规格不一致或超出本形态的条目在本节登记裁决结果，作为闭环档案不再变化。
裁决于 2026-11-05 由负责人点名作出。

| # | 外部设计的说法 | 现行事实（SPEC / AGENTS / 代码） | 差异性质 | 裁决 |
|---|---|---|---|---|
| C1 | 前台导航三项，含 `/about` 关于页（个人简介 / 技术栈 / 联系方式） | 裁决前路由表无 `/about`；外部两份方案自相矛盾——《整合设计方案》与原型 HTML 的导航都只有两项 | 新增需求 | **采纳**：新增 F19（P1，静态生成），导航由两项扩为三项；见 DESIGN D31。**已实施（2026-11-05）** |
| C2 | 纸白令牌 `#f4f1ec` 一组语义化令牌（`--ink/#1a1a18`、`--brown/#7a5a3a`、`--rule/#d9d2c5` 等） | 四色均已切换并实测（2026-11-05）：背景 `#f4f1ec`、主墨 `#1a1a18`（A1）、辅助灰 `#625d53`（A2）、极细线 `#d9d2c5`（A3）；代码里不再有 D30 前的旧值 | 视觉"锁定项"冲突 | **裁定切换**（DESIGN D30），按三步执行协议：全站色值替换清单 → 对比度重算（最差 6.45:1 → 5.56:1，仍 AA）→ 重出软著材料。**当前状态：已实施（2026-11-05）**——A 阶段四色全部落地，**A4 层间区分度浏览器实测已完成且现有内容通过**（实测结果与未覆盖场景见 DESIGN D30「A4 实测结果」与 I075）；余 B1（`--brown` 当前导航）；`--ink-2` 与数据色不引入、`--rule-strong` 不用于按钮边框、`--paper-2` 废弃见 I072、hairline 豁免 3:1 见 I073、blockquote 同字号场景挂 I075；方案与进度见 `docs/00-开发方法论/D30-剩余令牌切换方案.md`） |
| C3 | 路线图写"Next.js 14 项目初始化" | 实测 **Next.js 16.4.3**（React 19.3.0） | 外部按旧版本描述，与事实不符 | **不采纳**，以 AGENTS.md 版本事实为准；技术选型锁定不变 |
| C4 | Project 含 `demoUrl` / `startDate` / `updatedAt`，`kind` 含 `research` | 现行 Project 无 `demoUrl`/`startDate`/`updatedAt`，`kind` 为 `product/tool/site` | schema 差异；加字段要出迁移、同步查询层白名单与表单校验 | **不实现** |
| C5 | Log 关系用 `onDelete: Cascade` | 现行删除走两步确认 + `PRJ_001` 保护，未用级联删除 | 语义冲突：级联会绕过"项目删除前必须无日志"的守卫 | **不实现**，不建议照抄 |
| C6 | 新增 `SiteConfig` 模型（站名 / 主人 / 简介 / 联系方式 / 备案号入库） | 站点标识单源为 `src/lib/site.ts` + 环境变量（`SITE_*`），无数据库表 | 架构差异：入库要多一张表、一个管理界面与鉴权面 | **不实现**（单站点场景 env 方案更省，且少一处漂移点） |
| C7 | `lessonLearned`"发布时必填" | 现行可空；缺摘要时详情页显示显式告警 | 收紧校验属需求变化 | **不实现**（不把发布门槛抬高） |
| C8 | 验收含 Lighthouse ≥90、首屏 <1.5s、Person/BlogPosting 结构化数据、Next.js Image 组件 | 未纳入这些指标；正文图片走普通 `<img>`（Phase 5b 已追认，不经 `next/image`） | 超出项；**Next Image 与现行 `<img>` 方案冲突**，照抄要推翻 5b 的追认简化 | **不实现**（WCAG AA 对比度判据已在 D21/D30 单独核算，不依赖此条） |
| C9 | 《合规需求设计方案》的整块多用户义务：邮箱注册 + 密码找回、手机号验证码、GitHub Token 加密入库、User 表与租户隔离、UGC 避风港与侵权投诉、内容审核与举报、管理员分角色与审计日志、数据导出与注销、Freemium 付费 | 本站无注册、无第三方投稿；schema 只有 Project/Log；实现要新增 4 个依赖 + 3 个付费外部服务，且已登记多轮的软著材料会作废 | **形态冲突**：约六成条目的前提在本站根本不存在 | **V1.0 不实现**，整块归档为 V2.0 备选（DESIGN D19、Phase 9；逐条对照见 `docs/00-开发方法论/合规需求差距分析与分期方案.md`）。该方案中与定位无关的合规项**已吸收**（见本节末清单），不因形态冲突而一并丢弃 |
| C10 | 草稿界面设定：首页 4 个固定"档案条目"展开卡（`aria-expanded` + 纯 CSS 抽象缩略图 + 展开全部/收起全部）、联系区"本地演示表单"（提交仅本地提示不发请求）、页脚强制"演示声明" | 现行首页是状态看板 + 精选 + 最新日志；无联系表单；库里第一条真实数据就是本项目自己（D27） | 旧稿设想，未采纳 | **不实现**：真实档案库不需要演示声明与假表单；要对外联系入口走 F19 + 环境变量，未配置显示"待补充" |

**草稿中符合单人形态、已整合进第二节的需求**（不再登记为差异）：内容摘要口径与三时间字段分工
（F03/F06/§3.1）、摘要缺失显式告警（F03）、口令未配置与口令错误表现一致且不泄露配置状态（F04）、
双层限流与边缘覆写 XFF（F04）、文件头签名判类型与服务端生成对象名逐段断言（F10）、
OSS 最小权限与生命周期清理（F10/F17）、下钻页不进全局导航且带返回退路（F11）、
响应式三档无横向滚动与"待补充"不虚构（F12）、合规位未配置整行不渲染（F15）、
敏感信息九类形态与服务端执行（F16）、GitHub 商标声明（F18）、被拒保存不丢正文（F05，实现见 D26）。

## 九、冻结状态与变更规则

1. 本文件为 **V1.0 冻结口径**：F01–F18、第三节数据模型与状态机、第四/五节契约、第六节追溯矩阵
   与第八节裁决均已闭环。C1/F19（`/about` 关于页）**已于 2026-11-05 实施完成**（实施确认见 D31）。
   仍开放的是 C2/D30 的**收尾与 B1**：纸白背景、主墨（A1）、辅助灰（A2）、极细线（A3）已切完，
   A4 已完成（状态收口 + 层间区分度浏览器实测：现有内容判据通过，实测数据见 D30「A4 实测结果」；
   未覆盖的 `.log-body blockquote` 同字号场景挂 I075 等裁定）；余 `--brown`（B1，已批准待做）；
   `--ink-2` 与数据色按裁定不引入、`--rule-strong` 不用于按钮边框。
   方案与判据见 `docs/00-开发方法论/D30-剩余令牌切换方案.md`。
   除此之外，任何功能增删、字段变更、摘要口径调整都必须**先停下、报负责人点名授权**，再改本文件与实现。
2. 编号即坐标且不复用：`F##`（本文件）、`D##`（DESIGN）、`I###`（ISSUES）、`Phase #`（DESIGN）
   一经分配不重排、不重命名；被取代的条目加注取代者，不删除旧文。改需求编号等于重命名，需点名授权。
3. 本文件与代码/现实冲突时以现实为准，并报告冲突点，不自行抹平（AGENTS.md 文档体系规则）。
   第三节草案与 `prisma/schema.prisma` 逐字段对拍，漂移即本节过期。
4. 每次改动在本文件头「维护留痕」追加一行，注明授权来源与改动范围；
   若改动落在软著收录清单内的文件，须重出两份材料并一并提交（AGENTS.md 软著材料生成铁律）。
5. 门禁状态：「待确认（门禁 2）」按负责人指示**暂保留**，本轮不推进为定稿。
