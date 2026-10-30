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
| F10 | 作为管理员，我能上传图片得到 OSS 外链，以便正文插图不落服务器本地 | Server Action 转发阿里云 OSS |
| F11 | 作为访客，我能浏览项目列表与项目详情，以便按作品维度看档案 | /projects、/projects/[slug] |

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
| / | P0 | getSafeLogs + 项目表 | 首页 |
| /logs | P0 | getSafeLogs（支持 project/tag 筛选参数） | 日志大厅 |
| /logs/[slug] | P0 | getSafeLogBySlug（仅已发布） | 详情+防伪印章；未发布 slug 返回 404 |
| /projects、/projects/[slug] | P1 | 项目表 + getSafeLogs | 作品维度 |
| /admin | P0 | 需登录 | 后台入口/概览 |
| /admin/projects | P0 | 需登录 | 项目管理 |
| /admin/logs/new、/admin/logs/[id]/edit | P0 | 需登录 | 双栏编辑器 |
| /api/auth/* | P0 | NextAuth | GitHub OAuth 回调 |

### Server Actions

| Action | 入参 | 出参 | 错误码 |
|---|---|---|---|
| saveLogDraft | {id?, title, slug, projectId, tags[], beforeContent, afterContent?, beforeDate, afterDate?, lessonLearned?} | {id} | AUTH_001 未登录；VAL_001 参数校验失败；LOG_001 slug 重复 |
| publishLog | {id} | {contentHash, publishedAt} | AUTH_001；LOG_002 日志不存在 |
| unpublishLog | {id} | {ok} | AUTH_001；LOG_002 |
| saveProject | {id?, slug, name, kind, status, summary?, repoUrl?} | {id} | AUTH_001；VAL_001；PRJ_002 slug 重复 |
| deleteProject | {id} | {ok} | AUTH_001；PRJ_001 项目下仍有日志，禁止删除 |
| uploadImage（P1） | FormData(file) | {url} | AUTH_001；IMG_001 类型/大小不合法（仅 jpg/png/webp/gif，≤5MB） |

错误返回统一结构：{ ok: false, code: string, message: string }；成功：{ ok: true, data }。

## 四、非目标清单（再次明确）

1. 不做面向公众的注册/登录——访客只读，无任何账号体系；
2. 不做富文本所见即所得编辑器——Markdown 双栏纯文本足够；
3. 不做日志版本历史/回收站——git 与数据库备份承担该职责；
4. 不做移动端 App/小程序——响应式 Web 覆盖。