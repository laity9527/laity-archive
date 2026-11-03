# SPEC：Laity 项目档案库需求规格

作者：张磊
创建日期：2026-10-30
状态：待确认（门禁 2）
上游：AGENTS.md（事实基座）；下游：DESIGN.md

已确认的三项决策（2026-10-30）：
1. 后台登录：NextAuth + GitHub OAuth，仅允许我本人的 GitHub 账号；
2. 生产部署：自有服务器 Docker + Nginx + SSL；
3. 本地环境近期安装，Phase 1 即为可运行的最小真闭环，不走降级骨架。

---

## 一、功能清单

### P0（首批交付必须，缺一不可上线）

| 编号 | 用户故事 | 说明 |
|---|---|---|
| F01 | 作为访客，我能浏览首页，以便快速了解厂牌定位与当前状态 | 大标语、状态看板（项目名/类型/状态/日期）、精选项目、最新日志 |
| F02 | 作为访客，我能浏览日志大厅，以便按项目和标签筛选复盘记录 | 双层筛选（项目、标签）；左侧 200px BEFORE/AFTER 时间轴 |
| F03 | 作为访客，我能阅读日志详情，以便看到完整的判断与验证过程 | 限宽 720px 宋体正文；底部防伪印章（SHA-256 + 发布时间） |
| F04 | 作为管理员，我能用 GitHub 账号登录后台，以便安全地管理内容 | 仅白名单账号可进；非白名单一律拒绝 |
| F05 | 作为管理员，我能新建/编辑日志，以便记录 BEFORE 判断与 AFTER 验证 | 双栏 Markdown 编辑器；可存草稿（isPublished=false） |
| F06 | 作为管理员，我能发布日志，以便内容带着存证公开 | 发布时自动算 SHA-256 写 contentHash、记服务器时间 publishedAt |
| F07 | 作为管理员，我能管理项目（增改删），以便日志有所归属 | 删除仍有日志挂靠的项目必须被拒绝 |
| F08 | 作为访客，我绝看不到未发布内容，以便草稿与公开严格隔离 | 前台一切查询强制走 getSafeLogs 类封装 |
| F09 | 作为管理员，我发布的 Markdown 不会引入 XSS，以便站点安全 | 渲染必过 rehype-sanitize |

### P1（后续 Phase，不阻塞上线）

| 编号 | 用户故事 | 说明 |
|---|---|---|
| F10 | 作为管理员，我能上传图片得到 OSS 外链，以便正文插图不落服务器本地 | Server Action 转发阿里云 OSS；类型判定读文件内容签名（magic bytes），不看浏览器上报的 MIME |
| F11 | 作为访客，我能浏览项目列表与项目详情，以便按作品维度看档案 | /projects、/projects/[slug] |
| F12 | 作为访客，我在任何页面都知道自己在哪、怎么走去别处，以便把本站当正常网站使用 | 前台持久导航（字标 = 首页 + 开发日志 + 作品档案）、当前页 `aria-current`、跳到正文、正文容器 `id="main"`、筛选无结果时给"清除筛选"出口 |
| F13 | 作为搜索引擎/分享方，我能拿到规范的站点信息，以便收录与预览卡片正常 | 每页 `title`/`description`（详情页标题跟内容、描述取"经验总结"）、`metadataBase` + Open Graph + Twitter card、`/robots.txt`（屏蔽 /admin 与 /login）、`/sitemap.xml`（只含已发布内容，请求期取数）、键盘焦点可见 `:focus-visible` |
| F14 | 作为站长，我需要一个不依赖登录的健康检查端点和一个诚实的错误页，以便上线后能判断"是站点挂了还是数据库挂了" | `/api/health` 返回 `{status, db}`，数据库不可达时 503 且不泄露任何异常细节；未匹配路由走品牌化 404；渲染异常走错误边界并可重试 |
| F15 | 作为访客，我想知道这个站拿了我什么、存了什么、怎么删，以便本站满足上线合规要求 | `/privacy` 隐私与数据说明页（按当前实现逐条写，不承诺做不到的事）；页脚提供入口与 ICP 备案号位（备案号走 `SITE_ICP` 环境变量，未配置则不渲染该行） |

### P2 / 非目标（本期坚决不做）

- 评论、点赞、全文搜索、RSS、多用户/注册体系、国际化 —— 个人档案库无此需求，做了徒增攻击面；
- GitHub API 自动锚定 commit 数 —— 数据模型不为此加字段，日志页不展示 commits 统计（此前 Mock 中的 ⏱/commits 为装饰数据，仅保留可由 beforeDate/afterDate 直接计算的时长）；
- 访问统计/埋点 —— 上线后视需要另立需求。

## 二、数据模型（Prisma 建表草案）

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
  beforeContent String
  afterContent  String?
  beforeDate    DateTime
  afterDate     DateTime?
  isPublished   Boolean   @default(false)
  lessonLearned String?
  publishedAt   DateTime?
  contentHash   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([isPublished, beforeDate])
  @@index([projectId])
}
```

约定（继承 AGENTS.md）：时间一律 UTC 存储；contentHash 只在发布动作时写入；
kind/status 用字符串而非 enum，降低迁移成本，合法值在服务层校验。

## 三、接口契约

架构为 Next.js 全栈，写操作统一走 Server Action（不另设 REST 层），页面直读数据库（RSC）。

### 页面路由

| 路由 | 优先级 | 数据来源 | 说明 |
|---|---|---|---|
| / | P0 | getArchiveBoard + getSafeLogs | 首页：精选区（有已发布日志的项目按最近发布取前三）+ 状态看板（含零日志项目，显示"尚未发布"）+ 最新日志 |
| /logs | P0 | getSafeLogs（支持 project/tag 筛选参数） | 日志大厅；筛选无命中时给"清除筛选"出口 |
| /logs/[slug] | P0 | getSafeLogBySlug（仅已发布） | 详情+防伪印章；未发布 slug 返回 404；已发布但缺摘要/时间时显式提示"存证缺失"，不静默省略印章 |
| /projects、/projects/[slug] | P1 | 项目表 + getSafeLogs | 作品维度 |
| /admin | P0 | 需登录 | 后台入口/概览 |
| /admin/projects | P0 | 需登录 | 项目管理 |
| /admin/logs/new、/admin/logs/[id]/edit | P0 | 需登录 | 双栏编辑器；已发布日志的编辑页提供「下架」动作 |
| /api/auth/* | P0 | NextAuth | GitHub OAuth 回调 |
| /robots.txt | P1 | 静态生成 | 放行公开路径，屏蔽 /admin、/login 与 /api，指向 sitemap |
| /sitemap.xml | P1 | getSafeLogs + 项目表（请求期取数） | 只含公开路由（含 /privacy）与已发布内容，草稿与 /admin 不出现 |
| /privacy | P1 | 静态 | 隐私与数据说明（F15），进 sitemap 与页脚 |
| /api/health | P1 | 一次性 `SELECT 1` | 运维探针，需登录无关；no-store + noindex |

### Server Actions

| Action | 入参 | 出参 | 错误码 |
|---|---|---|---|
| saveLogDraft | {id?, title, slug, projectId, tags[], beforeContent, afterContent?, beforeDate, afterDate?, lessonLearned?} | {id} | AUTH_001 未登录；VAL_001 参数校验失败；LOG_001 slug 重复 |
| publishLog | {id} | {contentHash, publishedAt} | AUTH_001；LOG_002 日志不存在 |
| unpublishLog | {id} | {ok} | AUTH_001；LOG_002 |
| saveProject | {id?, slug, name, kind, status, summary?, repoUrl?} | {id} | AUTH_001；VAL_001；PRJ_002 slug 重复 |
| deleteProject | {id} | {ok} | AUTH_001；PRJ_001 项目下仍有日志，禁止删除 |
| uploadImage（P1） | FormData(file) | {url} | AUTH_001；IMG_001 类型/大小不合法（仅 jpg/png/webp/gif，≤5MB） |

动作有两种形态（2026-11-02 经我确认，SPEC 原写"统一 `{ok,code,message}`"与实际不符，按实际改）：

- 页面表单动作（saveLogDraft / publishLog / unpublishLog / saveProject / deleteProject）：成功与失败都 `redirect` 回原页，用 URL 参数表达结果——`?saved=1`、`?published=1`、`?unpublished=1`、`?error=CODE`。这样结果可复核、可截图留证，是 Phase 4 既定验收口径；
- 编辑器内动作（uploadImage）：调用方要拿返回值插进正文，因此返回对象 `{ ok: true, url, bytes }` 或 `{ ok: false, code }`。

两种形态都不带 `message` 字段：错误码到用户文案的映射统一收在 `src/lib/error-text.ts`，其中 `VAL_001` 按来源表单（log / project）取细则，未知码原样显示码本身。

## 四、非目标清单（再次明确）

1. 不做面向公众的注册/登录——访客只读，无任何账号体系；
2. 不做富文本所见即所得编辑器——Markdown 双栏纯文本足够；
3. 不做日志版本历史/回收站——git 与数据库备份承担该职责；
4. 不做移动端 App/小程序——响应式 Web 覆盖。
## 五、上线基线（工程与合规）

| 项 | 要求 | 现状 |
|---|---|---|
| 回归测试 | 纯逻辑必须有可重复运行的测试：D5 摘要口径、图片内容签名、slug 与表单取值、错误码文案完整性、时间展示、路由归属判定 | `npm test`（Node 自带 test runner，零新依赖），30 条断言全绿；DB 层与需登录的动作层不在覆盖内，仍靠自测表与人工联调 |
| 构建门禁 | `npm run lint`、`npx tsc --noEmit`、`npm run build` 必须全 0 才算可发版 | 全 0 |
| 健康检查 | 提供与登录无关的 `/api/health`，能区分"进程活着"与"数据库连得上"，异常不外泄细节 | 已实现，实测库停止时 503 `{"status":"degraded","db":false}`、恢复后 200；生产编排的 app 探针已改打这一条并校验响应体 `db === true`（I036），`web` 等 `app` healthy 再起 |
| 持续集成 | 四条门禁不能只靠人记得跑（I037） | `.github/workflows/ci.yml`：`npm ci` → `prisma generate` → lint → tsc → test → `prisma migrate deploy` → build → 软著材料两步自检（漏登记新文件、HTML 与说明书不同步都会红）。配一次性 `postgres:16` 服务，因为"构建期是否查库"本机未能实测；工作流 env 全为占位值。Actions 实跑待推送后确认 |
| 错误处理 | 未匹配路由有品牌化 404；渲染异常有可重试的错误边界且不显示内部信息 | `src/app/not-found.tsx`、`src/app/error.tsx` |
| 合规位 | 隐私与数据说明页按真实行为撰写；ICP 备案号走 `SITE_ICP` 环境变量，未备案不硬凑文案 | `/privacy` 已上线；备案号待我本人在备案通过后填入 |
| 部署与回滚 | 有一份可照着做的上线/回滚手册，含迁移镜像标签必须刷新这一条（I026） | `docs/00-开发方法论/上线与回滚手册.md` |
| 安全头与传输 | TLS 1.2/1.3、HSTS、`nosniff`、`X-Frame-Options`、后台与 404 禁止索引 | nginx + Proxy 已配，本机预跑实测响应头齐 |
