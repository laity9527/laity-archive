# 附录 C · 工程落地与分批实施

配套：`重构方案-V3-2026-11-16.md`、附录 A（令牌）、附录 B（IA 与逐页规格）。

---

## 一、目录与分层（目标态）

```
src/
  styles/                  ← B1 拆出（B0 先留在 globals.css）
    tokens.css             ← 语义层 + 暗色覆盖
    base.css               ← reset / 排版基线 / 焦点 / 选区
    layout.css             ← 容器、栅格、间距
    components.css         ← 按钮 / 输入 / 卡片 / 列表 / 目录 / 印章
    markdown.css           ← .log-body 全部规则
    print.css              ← 打印
  components/
    ui/                    ← 原子组件（B1）
    layout/                ← SiteNav / SiteFooter / ThemeToggle / CommandPalette
    feature/               ← SectionHead / Breadcrumbs / CodeBlock / ZoomableArticle / Timeline / Seal / Toc
    icons/                 ← 14 个自绘 SVG（B1）
  lib/                     ← 数据访问与纯函数（不变）
```

**B0 的取舍**：不新建 `styles/` 目录（拆文件会让 Tailwind 的 `@source` 兜底与产物哈希同时变化，
收益要到 B1 才显现）。B0 只往 `globals.css` 追加三段：打印、代码块、图片。B1 统一搬家。

---

## 二、B0 组件清单（本轮新增）

| 文件 | 类型 | 职责 | 依赖 |
|---|---|---|---|
| `src/components/SectionHead.tsx` | Server | 编号 + 标题 + 右侧动作 + hairline | 零 |
| `src/components/Breadcrumbs.tsx` | Server | 层级导航，末项 `aria-current` | 零 |
| `src/components/CodeBlock.tsx` | Client | 语言标签 + 复制按钮 + 横向滚动 | `CopyButton` 的 clipboard 逻辑（内联，避免多一层） |
| `src/components/ZoomableArticle.tsx` | Client | 包裹正文，图片点击开灯箱，Esc/焦点归还 | 零 |
| `src/lib/markdown.tsx`（改） | Server | `pre` 改为渲染 `CodeBlock`，语言从 className 取 | 上述 |
| `src/app/page.tsx`（改） | Server | 首页重排 | `SectionHead` |
| `src/app/u/[handle]/logs/[slug]/page.tsx`（改） | Server | 面包屑、区块头、正文包裹、打印类 | 上述 |

不做：图标集（B1）、暗色开关（B1）、命令面板（B4）。

---

## 三、数据模型（B4 才动，B0 零变更）

```prisma
model Log {
  // 已有字段不动
  tags          String[]   // 显示名（原始大小写）
  tagsKey       String[]   // 新增：小写规范键，查询与 URL 用
  series        String?    // 新增：系列/合集
  featured      Boolean @default(false)   // 新增：手动精选
  pinnedAt      DateTime?  // 新增：置顶
  @@index([tags], type: Gin)
  @@index([tagsKey], type: Gin)
}

model PreviewToken {   // 新增：草稿只读预览
  id        String   @id @default(cuid())
  token     String   @unique
  logId     String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model AuditEvent {     // 新增：后台操作审计
  id         String   @id @default(cuid())
  actorId    String
  action     String
  targetType String
  targetId   String
  meta       Json?
  createdAt  DateTime @default(now())
}
```

迁移原则：
- 一次迁移只加可空字段或带默认值的字段；`tagsKey` 允许为空，读取时 `tagsKey.length ? tagsKey : tags.map(lower)`。
- 回填脚本幂等（按 `id` 回写），失败可重跑。
- 不给 `Log` 加软删除：现有"下架"已满足语义。

---

## 四、性能预算（重构期间不放松）

| 指标 | 阈值 | 核对方式 |
|---|---|---|
| 任一前台页 Prisma 调用 | ≤3（`/logs` ≤2，详情 ≤2） | dev 开 `log_statement=all`，数 `execute` 行（Prisma 语句在 execute，不在 statement） |
| 首屏 JS 增量 | ≤15KB（相对 B0 前） | `next build` 的 route size 对比 |
| 首屏字体传输 | ≤120KB | 网络面板，CJK 分片按需 |
| LCP | ≤2.0s（本地生产构建 + 4G 节流） | Lighthouse |
| CLS | ≤0.05 | 图片必须带宽高比 |

B0 的具体约束：首页不新增客户端组件（`SectionHead` 是 Server）；
详情页只新增 `CodeBlock` 与 `ZoomableArticle` 两个小组件，按需 hydrate。

---

## 五、测试

| 层 | 现状 | B0 增量 | 后续 |
|---|---|---|---|
| 纯逻辑（node --test） | 192 条 | 不加（B0 无新纯函数） | 标签双轨键、归档分组、导入冲突 |
| 组件 | 无 | 不加 | B1 起按需（不引测试库，用 node --test + 纯渲染断言不现实，改为 E2E 覆盖） |
| E2E | 无 | 不加 | B5：登录→新建→发布→前台可见→下架 5 条 |

B0 的验收以"四道门禁 + 渲染产物抽查"为准：
- `npm run lint` / `npx tsc --noEmit` / `npm run build` / `npm test`
- 抽查渲染 HTML：面包屑存在且 `aria-current` 唯一；代码块有语言标签；正文图片可被灯箱接管（DOM 存在 `img`）。

---

## 六、分批实施（含 DoD）

| 批次 | 内容 | DoD | 预估 |
|---|---|---|---|
| **B0**（本轮） | 令牌补三段、首页、详情、4 个组件 | 四道门禁全绿；两页三档截图；打印预览无 UI 元素 | 1–2 人日 |
| **B1-a** ✅ | 15 个自绘图标、主题系统（暗色语义层 + 切换 + 无闪白脚本） | **已完成 2026-11-16**：tsc/lint/test(192)/build 全绿；`/about` 产物含主题脚本与 `aria-pressed`，页面实际引用的 CSS 含 3 处 `data-theme` 与暗色背景值 | 0.5 人日 |
| **B1-b** | `styles/` 拆分、12 原子组件、Toast、Skeleton | 暗色下正文 ≥7:1（实算）；组件在 3 页以上复用 | 2.5–3.5 人日 |
| **B2** | 其余前台 10 页重排、导航四项（"标签"待 B4） | 每页三档无横滚；键盘可达 | 5–7 人日 |
| **B3** | 后台侧栏、概览、行内操作、批量、编辑器工具栏、设置 | 行内发布即时生效；破坏性操作二次确认 | 5–6 人日 |
| **B4** | ⌘K、`/tags`、`/archive`、草稿预览、导入、OG 图、JSON Feed | 标签双轨 308 生效；OG 图 1200×630 可访问 | 4–5 人日 |
| **B5** | 动效、A11y 复核、性能实测、E2E、文档重写 | 现状说明书定稿；旧编号封存 | 2–3 人日 |

依赖：B1-a → B2/B3（可并行）→ B4 → B5。B0 独立，不阻塞。

**B2 进度（2026-11-16）**：第一批已完成日志大厅 `/logs`——左栏当前项改为棕左线（与详情页目录同一语言）、
搜索框并入顶栏并限宽 320px、结果行改“共 N 条 / 本页 N 条”、列表行距 40→32px、元信息 11→12px；
筛选与搜索逻辑一字未动。本轮同时把 B0/B1-a 新增的 6 个组件登记进收录清单 ③，
并把 `SiteNav` 自 ④ 平移进 ③（导航外壳，判定逻辑在 routes.ts、交互在 ThemeToggle），
材料重出后后窗口余量 **105 行**（生成器阈值 100）——下次改版面需留意这个紧余量。

**B2 第二批（2026-11-16）**：作品档案页 h1 44→32px、头部加 ink 收边线、元信息 11→12px；
租户主页标题 36/48→32px、副标 18→15px、头部加 ink 收边线。两页均在折走段 ③。

**B2 第三批（2026-11-16）**：全站页面标题统一到 32px——`/tags/[tag]`（步 44）、`/about`、`/login`、
`not-found`、`error`、`/privacy`、`/licenses`（步 30/36/40）全部改为 `text-[32px]`。
至此 B2 除「导航加标签入口」（依赖 B4 的 `/tags`）外已收口。

**B1-b 第一批（2026-11-16）**：新增 `Toast`——后台操作回执从“页内横幅 + URL 参数”改为右下角浮层：
成功类 4.5s 自动收起并清掉查询串（刷新不重复），错误类保持到手动关闭（错误码可截图）；
文案仍走 `error-text` 单源，未知码不原样回显。挂在 `admin/layout.tsx`（Suspense 包住，`useSearchParams` 需要边界）。
实现上消息改为渲染期派生（参数→文案是纯映射），只记“已关闭哪一条”，以避开 `react-hooks/set-state-in-effect`。

**B3 第一刀（2026-11-16）**：后台日志列表加行内「发布 / 下架」——`quickPublishAction` 只收 id，
写路径仍调 `publishLog`（按库中正文重算 SHA-256 + 敏感扫描，命中即 LOG_003 回落编辑页）与 `unpublishLog`，
不另开一套事务；成功后回列表并由 Toast 提示。删除仍只在编辑页（需输 slug 确认），不做批量。

**B4 第一刀（2026-11-16）**：新增 `/tags` 标签索引页 + 导航第四项「标签」。取数口 `getTagIndex()`
只取 `tags` 一列，按显示名聚合，排序「频次降序 → 名称升序（zh-CN）」；字号三档（≥5 / 2–4 / 1），
不加颜色与字重；`/tags/<tag>` 链接仍用显示名编码（tagsKey 双轨迁移未做，留在 B4 后续）。
同轮把 `/tags` 加进 sitemap 与材料收录清单 ③。

**B4 第二刀（2026-11-16）**：新增 `/archive` 归档页——按 `beforeDate` 分年/月（年降序 → 月降序 → 日降序），
条目只给日期、标题与项目，年份锚点可分享；取数口 `getArchive()` 只取列表列（不取正文），
时间按 UTC 切片。同轮把 `/tags`、`/archive` 加进 sitemap，日志大厅标题旁加「按年月归档 →」入口，
并把大厅 h1 从 44px 收到 32px。

**B4 第三刀（2026-11-16）**：新增 `/api/search`（一次返回日志 / 项目 / 标签三组候选，日志复用 `searchLogsLimited`，
响应 `no-store`）与 `CommandPalette`（⌘K / Ctrl+K 唤起，↑↓ 选择、Enter 跳转、Esc 关闭；
由 SiteNav 按需 dynamic 加载，未打开时不进首屏包）。导航右端加搜索入口，输入防抖 200ms，空词不发请求。

**`tagsKey` 双轨：本轮不做（裁定）**：写入侧 `normalizeTagList` 早已做大小写无关去重，库内不存在仅大小写不同的标签；
当前 52 个标签里没有重复。双轨的收益是“未来 URL 稳定”，代价是一次 schema 迁移 + 回填 + 308 + 两处查询改造。
在没有实际重复数据前做，属于为假想问题付迁移风险。触发条件写死：**出现第一个仅大小写不同的标签时**再启动；
在那之前 `/tags/<显示名>` 继续作为规范地址。

**B3 第二刀（2026-11-16）**：编辑器加格式工具栏（粗体 / 斜体 / 行内码 / 引用 / 列表 / 链接——
只作用于当前标签页，有选中即包裹、无选中插占位词并选中它），补 ⌘B / ⌘I / ⌘K 快捷键，
并将粘贴截图与拖入图片接到同一个上传函数（复用 `uploadImageAction`，与「插入图片」按钮同一条链路）。
同时修一处快捷键冲突：SiteNav 的 ⌘K 在 input / textarea / 可编辑区内不再抢键——编辑器里 ⌘K 是插链接。

**未验证（如实记录）**：编辑器在登录后才能打开，dev 登录密码在 `.env`（AI 不读凭据），
所以本轮只做了类型 / lint / 构建三维核对，**未做浏览器点击验证**；快捷键与粘贴上传的交互行为待负责人录入时实拉一次。

**B5 文档部分（2026-11-16）**：新增 `docs/现状说明书.md`（五章：是什么 / 数据与口径 / 页面与路由 / 工程与运维 /
不做的事，附变更记录）；`SPEC.md` / `DESIGN.md` / `ISSUES.md` 移入 `docs/archive/2026-11-16-旧编号体系/`
并加封存声明；README 导读与冲突判定顺序改指现状说明书；AGENTS 续二十六只记路径事实。
材料切口问题仍未解，不夹带在本轮，单独处理。

**B2 补充（2026-11-16）**：`/logs` 新增排序切换（判断时间 / 发布时间）——查询层 `getLogList` /
`searchLogsLimited` 增加 `sort` 参数并收成 `logOrderBy()` 单源；`published` 口径下 `publishedAt` 为空的排到最后，
游标仍用 id（两种排序下分页都稳定）。页面上所有站内链接都带当前排序，否则点筛选会悄悄重置顺序；
默认仍是 `decided`，与首页「最新日志」按发布时间的口径区分。

**B3 收尾（2026-11-16）**：概览统计从三张卡扩到四张（项目总数 / 已发布 / 草稿 / **近 7 天发布**）；
`getAdminOverview` 加一次 count（滚动 7 天窗口，不用自然周——单人站关心的是“最近有没有产出”，
自然周会让周一早上看板归零）；卡片网格 3 列改 4 列（窄屏 2 列）；概览 h1 30→32px 与全站统一。

**材料出件：需要你裁定口径（唯一的开梗阻）**：当前切口落在折叠段与 ④ 段之间的空白分隔行，
且已证实在切口前增删行无效（起点与内容同步位移）。两条可选路径：
① **最小偏差**：允许后窗口首页 49 行（仅一行偏差），我改生成器的边界处理；
② **结构重排**：继续把 ④ 段页面移进折走段，直到切口落在源码行——会减少材料里“整份可见”的页面数。
两条都不改变“总页数 60 / 每页 50 行”的提交口径以外的任何东西；①碰的是提交格式，所以停下来问你。

**B4 补充（2026-11-16）**：新增 `/feed.json`（JSON Feed 1.1）——与 `/feed.xml` 同数据同摘要口径
（FEED_LIMIT 20、`getLatestLogs`、`toPlainText`），item 的 id 用永久链接（slug/handle 不变则不产生新条目）；
layout 的 `alternates.types` 加 `application/feed+json`。
**为何不做 OG 分享图（本轮裁定）**：`next/og` 的 satori 需要字体数据才能画中文，
要么内嵌数 MB CJK 字体、要么请求期抓字体（不稳定），成本与首屏无关但风险实在；
JSON Feed 零依赖、可端到端验证，先把分发闭环补齐。

**B3 第三刀（2026-11-16）**：编辑器自动保存——停止输入 30s 或失焦时把正文（含 AI 标记）写进 `sessionStorage`，
与提交失败暂存共用同一个 key，所以服务端打回（`?error=`）回填的是**最新一版**，而不是“最后一次点保存”的版本；
标签行显示「已自动保存 HH:MM」。不自动提交、不改草稿状态、不发网络请求。
**未验证**：编辑器需登录，本轮仍只做到类型 / lint / 构建三维核对，未做浏览器交互验证。

**材料阻塞（如实记录）**：本轮把 `src/app/layout.tsx` 也平移进 ③ 后，后窗口余量恢复，
但生成器改报“切口第 12701 行是空行”而拒件；在 ③ 增删注释行不影响切口（③ 为折叠段，
不进渲染行流），而在 ④ 增行会同时改变总行数与容量、切口位置不变。
按经验裁定：**不在本轮为凑边界而增删无意义代码**，材料统一在 B5 重出——
届时先确认 ④ 的总行数跨过一个 50 行页边界，让切口落到源码行上。

**B3 第四刀（2026-11-16）**：后台日志列表加批量下架——每行勾选框用 `form="bulk-form"` 关联到列表上方的批量表单
（行内已有“发布/下架”表单，不能再嵌套），提交后逐条复用 `unpublishLog`；Toast 新增 `bulkUnpublished` 回执（带条数）。
**裁定不做**批量发布（需逐条重算摘要并过敏感扫描）与批量删除（破坏性动作，要求输 slug 确认）。
**未验证**：后台需登录，仅做类型 / lint / 构建三维核对，未做浏览器交互验证。

**B4 收尾（2026-11-16）**：`/logs` 空态补出口——搜索/筛选无果时除了「清除」，再给「按标签看 / 按年月看」
两条横切面入口；库本身为空（totalLogs=0）时不渲染这两条，避免指向两个同样空的页面。
顺手把空态文案从 12px / mono 改为 14px / sans（中文不走等宽的规则）。

**B5 验证债务（2026-11-16）**：新增 `docs/02-测试记录/2026-11-16-重构V3-自测表.md`——把本轮“代码已改、但需登录/浏览器才能验”的项
收成 34 项可照做清单（编辑器工具栏与快捷键/粘贴拖拽上传/自动保存、Toast、行内发布与下架、批量下架、
主题切换、⌘K 面板、/tags、/archive、空态出口、排序切换、feed.json、打印与软著材料分页），
并单列一节“已由自动化覆盖”的项，避免重复手点。这份表是 AI 侧验证工作的出口。

**B4 补充二（2026-11-16）**：新增 `/tags/[tag]/feed.xml` 标签订阅源——同标签下最新 20 篇已发布日志
（`getTagFeedItems` 只取标题/链接/发布时间/摘要/标签，不取全文）；标签非法或无已发布日志回 **404**
（不产出永远为空的源）；标签页的 `alternates.types` 指向该源，阅读器可自动发现。
实测：`/tags/WCAG/feed.xml` 200（1 item、`atom:link` 自指），`/tags/zzzzz/feed.xml` 404。

**工程减债（2026-11-16）**：归档分组从 `getArchive()` 里抽成纯函数 `src/lib/archive.ts` 的 `groupArchive()`，
并补 `tests/archive.test.ts` 六条（跨年跨月、年降序与月降序、组内保持传入顺序、UTC 日界跨月、空输入、count 口径）；
测试总数 **192 → 198**，分组行为与页面输出不变。抽出理由：这是本轮新增功能里唯一零测试覆盖的逻辑，
与查询耦合时无法单测。

**工程减债二（2026-11-16）**：`pickFeatured()` 从 `projects.ts` 抽到 `src/lib/featured.ts`（纯函数，泛型约束 `{count, latest}`），
`projects.ts` 改为再导出，页面引用路径不变；补 `tests/featured.test.ts` 六条（零日志不进精选、日志数优先、
同数按最近更新且 null 视为最旧、take 截断与 0/负数、空看板、不改入参）。测试总数 **198 → 204**。

**材料出件：已解除（2026-11-16，你选“结构重排”，实际无需再移页面）**：本阶段源码增长（编辑器工具条与自动保存、
feed.json、/archive、/tags、命令面板）让总行数自然跨过页边界，切口落到合法行。当前口径：
**总行数 15356 / 总页数 308 / 提交 60 页（前 30 + 后 30）/ 收录 107 个文件 / 后窗口余量 179 行**；
边界签名：前窗口止于 `src/lib/time.ts` 第 6 个排版行、后窗口起于 `src/app/tags/page.tsx` 第 33 个排版行。
`源程序文档.html` 已重出，说明书字节未变。**遗留风险**：切口仍按 50 行步进，后续再改源码可能重现空行切口；
阈值 100 行与“小幅平移文件/增减注释”的处置方式不变。
本轮 commit 包含 BANDS 登记与代码，**不含重出的 HTML**；当前 `docs/04` 对应上一轮源码，已知不一致。
**重整理由（2026-11-16）**：主题与图标是所有后续页面的前置（导航、后台侧栏、空态都要用），
而样式文件拆分是纯结构改动、Toast 依赖具体页面接入——把有依赖的先做完，B2 就不会被 B1-b 卡住；
B1-b 可与 B2 并行。

---

## 七、文档迁移（裁定 ③ 的执行细则）

1. 新建 `docs/现状说明书.md`，五章：
   一、这是什么（定位与形态）；二、数据与口径（模型、摘要、标签双轨）；
   三、页面与路由（对照表 + 状态矩阵）；四、工程与运维（构建、部署、环境变量、性能预算）；
   五、变更记录（日期 + 一句话 + 影响面）。
2. 旧三份移入 `docs/archive/2026-11-16-旧编号体系/`，文件头加封存声明。
3. `README.md` 的"文档导读"改为指向现状说明书 + 三份附录 + 研发日志。
4. 代码注释里的 D##/F##/I### 不改写（改注释等于全仓翻动）。
5. 软著材料在 B5 统一重出一次，避免分批出件造成版本错位。

---

## 八、回滚策略

| 场景 | 动作 |
|---|---|
| B0 方向被否 | `git revert` 本轮 commit；令牌与组件可单独保留（互不依赖） |
| B1 样式拆分出问题 | 保留 `globals.css` 原文件，`styles/` 只做 `@import`，回滚即删目录 |
| B3 后台改坏写路径 | 写路径不在 B3 改动范围（只加行内入口，复用既有 Server Action） |
| B4 标签迁移失败 | `tagsKey` 可空 + 读取回落 `tags` 小写，旧逻辑继续可用 |
| 任何批次 | 每批独立 commit，commit 信息带批次号（B0/B1/…），便于单批回退 |

---

## 九、依赖政策（红线之外仍守）

- B0–B5 全程**不新增运行时依赖**：图标自绘、图表纯 CSS、OG 图用内置 `next/og`、
  代码高亮不做、命令面板自研。
- 若确需引入，必须同时给出：体积、可替代方案、回退路径、许可证，一次性决定。
- devDependencies 仅在 B5 评估 Playwright（E2E），其余不加。

---

## 十、B0 交付清单（本轮）

1. 四份方案文档（主方案 + 附录 A/B/C）。
2. `globals.css`：打印、代码块、图片三段样式。
3. `SectionHead`、`Breadcrumbs`、`CodeBlock`、`ZoomableArticle` 四个组件。
4. `markdown.tsx` 接入代码块。
5. 首页与详情页重排。
6. 四道门禁全绿 + 渲染产物抽查结果（写在交付说明里，不新建文档）。
