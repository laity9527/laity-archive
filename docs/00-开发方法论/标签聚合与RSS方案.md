# 标签聚合与 RSS 方案（V2.2 首批）

作者：张磊（方案由 AI 代笔，事实均已对拍源码与实测）
日期：2026-11-12
状态：**已实施（2026-11-12）**（六个 Commit 全部落地并逐个验收；第 7 条的解码判读已被实施期实测推翻，
按本文修订后的口径执行；「待裁决」三项均已裁断并按裁断实现）

上游：AGENTS.md（事实基座）、SPEC.md（F 编号）、DESIGN.md（D 编号）、
`docs/00-开发方法论/搜索高亮与数据导出方案.md`（V2.1 方案体例先例）
编号提案：**F26（标签聚合页）、F27（RSS 订阅）**；决策 **D37（标签聚合口径）、D38（RSS 口径）**——
批准后才登记进 SPEC/DESIGN，本轮两份根文档一字未动。
实测基线：HEAD `3af93f2`，工作区干净；本方案撰写轮只跑了只读探针与材料生成器（幂等验证零 diff），
未改任何源码、未提交。

---

## 〇、结论速览

| 问题 | 结论 |
|---|---|
| 新依赖 | **零**。RSS 2.0 用模板字符串手写（`src/lib/rss.ts` 纯函数），日期用内置 `toUTCString()`，不引入 feed/rss 类包（理由见第四节，D36 零依赖先例同口径） |
| 数据查询 | **两个功能都复用现有 DAL，不新增查询口径**：标签页用 `getSafeLogs({ tag })`（`tags: { has }` 精确匹配），RSS 用 `getLatestLogs(20)`（publishedAt 降序 + beforeDate 兜底）。唯一新增 DAL 函数是 proxy 前置判定用的 `hasPublishedTag(tag)`（索引级 `select { id }`） |
| 标签页 404 | **推荐 A 案：proxy 前置判定真 404**（与日志/详情同一机制：PPR 下页面级 `notFound()` 只返回 200，真 404 历来由 `src/proxy.ts` 出）。B 案软 404 违反 F13「真 404 带 noindex + no-store」口径，不推荐。**待裁决 ①** |
| 中文标签 URL | 框架已对 path params 做 `decodeURIComponent`（Next 源码 `route-matcher.js:getRouteMatcher` 实证），**页面侧禁止二次解码**；proxy 侧照 `readTenantSegment` 先例自行解码原始 pathname。归一化函数只做 trim + 空值/超长拒收 |
| 大厅链接落点 | **列表行内的标签文本**改链接（现状是 `join(" · ")` 纯文本）；**筛选区 chip 不动**（它是 F03 点名的筛选交互，改成跳转会破坏筛选）。此解读需你确认，见第九节报备 ① |
| head 自动发现 | `layout.tsx` 的 metadata 加 `alternates.types["application/rss+xml"] = "/feed.xml"`——官方文档原样范例，`metadataBase` 已就位，渲染为绝对 URL 的 `<link rel="alternate" …>`，全站生效 |
| 软著窗口 | 前窗口余量 **140 行**（实测），proxy +35 行后仍余 105，**无需让位**；后窗口余量 **179 行**，预算 +165 行后名义余 18 行，**处于翻页非线性敏感区**（最坏缺口约 19–30 行），预设两档让位预案（第五节）。最终一律以 `assertWindowFit()` 实测为准 |
| SPEC 冲突 | SPEC「非目标清单」第 5 条明文「不做……RSS……」——本任务即负责人点名解禁；实施时同步删去该词。同句「全文搜索」自 V2.1 起已漂移（搜索已实施），**报备不私改**（第九节报备 ②） |
| Commit 拆分 | 6 个（RSS 纯函数 → RSS 接线 → 标签数据层 → 标签页与链接 → proxy 真 404 → 文档收口），每个动收录文件的 commit 必带材料重出，每步停下报 diff 摘要 |

---

## 一、现状实测（全部对拍源码，锚点可搜索）

1. **标签存储与口径**：`prisma/schema.prisma` 的 `Log.tags String[]`，无 Tag 表、无迁移需求。
   入库解析在 `src/app/admin/log-actions.ts:parseTags`——按中英文逗号 `[,，]` 切分、逐项 trim、
   滤空串，**不小写化、不去重**；上限 `src/lib/forms.ts:LIMITS`——单标签 ≤24 字符（`tag`）、
   每条日志 ≤10 个（`tags`）。所以聚合匹配用**区分大小写的精确匹配**（Prisma `tags: { has }`），
   与大厅筛选完全同口径，不做大小写折叠（那需要 raw query 或内存过滤，超出本轮）。
2. **大厅**（`src/app/logs/page.tsx:LogBoard`）：标签出现在两处——
   ① 筛选区 `tagChip`（已是 `Link`，指向 `/logs?tag=…` 切换筛选，含 details 折叠）；
   ② 列表行内 `log.tags.join(" · ")`（`font-mono text-[11px] text-ink-soft` 纯文本）。
   列表行形态：`Timeline`（左 200px）+ 项目名 + h2 标题链接 `/u/[handle]/logs/[slug]` + 标签行。
3. **详情页**（`src/app/u/[handle]/logs/[slug]/page.tsx`）：header 内 `log.tags.join(" · ")` 纯文本；
   `instant = false`（退出即时导航校验，不改渲染方式）；文件内注释实证：**PPR 下页面级
   `notFound()` 只能返回 200，真 404 由 proxy 前置判定**。
4. **真 404 机制**（`src/proxy.ts`）：matcher 现为 `["/u/:handle/logs/:slug", "/u/:handle/projects/:slug", "/admin/:path*"]`；
   `readTenantSegment` 从**原始 pathname** 切段并 `decodeURIComponent`（失败一律 null）；
   未命中回 `notFoundResponse`——status 404 + `x-robots-tag: noindex` + `cache-control: no-store` +
   品牌化内联 HTML（四组色值字面量与令牌同值）。文案全常量，URL 参数不拼进 HTML。
5. **DAL**（`src/lib/logs.ts`）：`getSafeLogs({ tag })` 强制 `isPublished: true`、`beforeDate desc`、
   include project（name/slug/kind/status）+ user.handle，无主行跳过；`getLatestLogs(take, userId?)`
   按 `publishedAt desc + beforeDate desc` 兜底（D13 修订：批量入库同秒 publishedAt 会退化成不确定子集）、
   `publishedAt: { not: null }`，同样带 user.handle。**RSS 与标签页需要的字段都已在手，零 select 改动。**
6. **Route Handler 先例与缓存语义**：`src/app/admin/export/route.ts`（F25/D36）——GET + 查库 +
   `new Response`，**没有 `connection()`**。官方文档 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
   「With Cache Components」节实证：GET 默认请求期运行，**数据库查询本身就会终止预渲染**，
   无需 connection() 声明；`use cache` 可缓存查库但本轮不用（发布后失效要配套，YAGNI）。
7. **params 解码语义（2026-11-12 实施期实测推翻，本文原判读作废）**：本文原写「`getRouteMatcher`
   对每个动态段执行 `decodeURIComponent`，**页面拿到的 `params.tag` 已是解码值**，页面侧禁止二次解码」。
   **实测推翻：App Router 交付编码原样的 path 参数**——双编码探针三组对照：**单编码标签 → 404、
   双重编码标签 → 404、ASCII 标签 → 正常**。据此页面入口需自行 `decodeTagParam` 解码一次
   （新增于 `src/lib/forms.ts`：`try { return decodeURIComponent(value) } catch { return value }`，
   解码失败回退原值交 `normalizeTag` 拒收；try/catch 在两种环境下都安全——参数若已被解码，解码要么恒等、
   要么遇字面 `%` 抛错回退，不会损坏合法标签），再过 `normalizeTag`。proxy 拿的是原始 pathname，
   仍照 `readTenantSegment` 先例自行解码。两侧归一化共用同一纯函数（见 2.2）。
   实测判据与设计说明另记 DESIGN D37「判据」段。
8. **head 注入官方口径**：`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
   `alternates` 节原样范例 `types: { 'application/rss+xml': … }`。`src/app/layout.tsx` 已有
   `metadataBase: new URL(siteUrl())`，相对路径会渲染成绝对 URL。
9. **站点单源与外壳**：`src/lib/site.ts`（siteName/siteDescription/siteUrl）；
   `src/lib/routes.ts` 黑名单制（/admin、/login）——`/tags/*` 与 `/feed.xml` 天然公开，**无需改**（/about 先例）；
   `src/components/SiteNav.tsx:activeKey` 无 /tags 分支 → 标签页**无导航当前项**（与 /privacy、/licenses 同态，
   棕色下划线 0 处，符合「至多一个」铁律），SiteNav 不改；`src/app/robots.ts` disallow 仅 /admin、/login、/api——
   `/feed.xml` 不在 /api 下，天然放行，不改。
10. **窗口与测试基线（2026-11-12 实跑，探针与生成器自报逐项对拍一致）**：
    总行数 **10284** / **206 页** / 收录 **82** 文件；前窗口 1–1500，①+②=1360 行
    （`proxy.ts` 止于第 1360 行，**余量 140**）；后窗口 8801–10284，容量 **1484**，④=1305 行
    （`globals.css` 起于 8980，**余量 179**）；折走段 7300 行。
    `npm test` 实测 **131 条全绿**（SPEC「回归测试」表行仍写「113 条测试全绿（2026-11-11 实测…）」，已漂移，见报备 ③）。
    材料生成器幂等验证：本轮实跑 exit 0，`git status -- docs/04-软著材料` 零 diff。
11. **本地库数据**：13 篇已发布 / 20 篇草稿（F25 导出实测）、52 个标签（大厅 2026-11-06 注释实测）——
    浏览器验收有真数据可用，含中文标签。

---

## 二、功能一：标签聚合页（F26 提案）

### 2.1 路由设计

- 新路由 `/tags/[tag]`，文件 `src/app/tags/[tag]/page.tsx`（App Router 动态段，`PageProps<"/tags/[tag]">`）。
- URL 生成一律 `encodeURIComponent(tag)`；框架解码后交页面（现状实测第 7 条）。
  标签可含 `/`（parseTags 不禁）：编码为 `%2F` 后不是字面路径分隔符，proxy 按原始 pathname 切段不会误切，
  框架解码还原——往返无损。含 `%` 标签同理（`%` → `%25`，框架解一次，页面不再解）。
- `/tags` 本身（无段）不建页面：matcher 不命中、框架 404，与 `/u` 裸路径同态。
- 归一化 `normalizeTag(value: string): string | null`（新增在 `src/lib/forms.ts`，该文件职责就是
  「表单与查询参数的公共取值工具」）：trim → 空串回 null → 超 `LIMITS.tag`（24）回 null。
  **不做 decode、不做大小写折叠**。页面与 proxy 共用；超长拒收让伪造长 URL 不进数据库。
- 页面配置 `instant = false`（与详情页同理：查库必然阻塞，退出即时导航校验；不改渲染方式）。
  不用 Suspense 包数据（详情页先例，直接 await）；不写 `generateStaticParams`（标签集随发布变化，
  请求期渲染即可；预渲染在查库处终止，详情页与导出路由同构，构建已有先例验证）。

### 2.2 数据查询

- 列表：`getSafeLogs({ tag })`——isPublished 恒真（草稿隔离）、`beforeDate desc`（与大厅同序）、
  带 project 与 user.handle。**0 行 → `notFound()`**：不存在、纯草稿标签、超长/空值一律同一出口，
  不泄露「标签存在但只有草稿」。
- proxy 前置判定（A 案）：`src/lib/logs.ts` 新增 `hasPublishedTag(tag: string): Promise<boolean>`——
  `db.log.findFirst({ where: { isPublished: true, tags: { has: tag } }, select: { id: true } })`，
  与 `isPublishedLogSlug` 同构（索引层命中即止）。入参约定为已过 `normalizeTag` 的值。
- 不新增 select 白名单、不动 D10 口径、无 schema/迁移/环境变量改动。

### 2.3 页面结构（视觉铁律合规）

```
main#main（mx-auto max-w-[1080px] px-6 py-24）
  h1「标签：{tag}」（中文标签走 font-sans；tag 值是用户数据，原样展示不翻译）
  p  {n} 条已发布日志 · Link「← 返回日志大厅」（/logs，详情页回跳同款样式）
  ul.@container（border-t border-ink）
    li（border-b border-hairline，flex md:flex-row，同大厅行）
      Timeline（beforeDate/afterDate，左 200px）
      article：项目名（mono 11px）/ h2 标题链接 /u/{handle}/logs/{slug} / 标签链接行
```

- **`@container` 必须加**：Timeline 容器查询的**第六个调用点**——现有五处（大厅/首页/租户主页/项目详情/
  日志详情，grep + Read 逐一实证；其中日志详情被 .gitignore 的 logs 规则遮蔽、默认 grep 扫不到，
  I081 的又一表现）。新调用点漏加则窄容器下时间轴不降级。标签页路径不含 logs 段，
  不受该遮蔽影响，Tailwind 正常扫描。
- 零新色值、零新令牌：标签链接沿用既有链接习语（`text-ink-soft hover:text-ink` +
  `hover:underline hover:decoration-1 hover:underline-offset-4`），**不用棕色**（--brown 用途仍限
  导航当前项与搜索高亮，AGENTS 视觉铁律不动）；焦点走全局 `:focus-visible` 2px 主墨框，不自定。
- 无圆角/阴影/渐变/图标库；字符只用既有习语（← ·）。
- `generateMetadata`：title `标签 {tag}`（模板自动缀站名）、description 含条数与站描述口径；
  查库失败/空标签回 `{ title: "标签不存在" }`（详情页先例）。
- 无搜索、无二次筛选、无分页（大厅本就是全量列表，同口径）。

### 2.4 两处链接接线（点名范围）

1. **大厅列表行**（`src/app/logs/page.tsx` 标签行）：`join(" · ")` 改为逐个 `Link`（` · ` 作文字分隔），
   href `/tags/${encodeURIComponent(tag)}`，样式沿用该行 mono 11px 辅助灰 + hover 习语。
   **筛选区 tagChip 与 details 折叠一字不动**（筛选是 F03 点名交互；聚合是新增出口，两者并存）。
2. **详情页 header**（`src/app/u/[handle]/logs/[slug]/page.tsx` 标签行）：同款改造。
3. 标签页自身列表行的标签同样链接化（一致性）。三处各自内联（每处 ~8 行），**本轮不抽共享组件**：
   抽取要新增收录文件吃窗口，且详情页 header 与列表行上下文有差异；出现第四处再议。
4. **范围外发现（列出不改，报备 ④）**：另有三处标签纯文本展示——首页最新日志行
   （`src/app/page.tsx`）、租户主页最新日志行（`src/app/u/[handle]/page.tsx`）、
   项目详情日志行（`src/app/u/[handle]/projects/[slug]/page.tsx`）。是否扩大接线范围等你点名。

### 2.5 404 两案（待裁决 ①）

**A 案（推荐）：proxy 前置判定，真 404。**
- matcher 增 `"/tags/:tag"`；`NOT_FOUND_COPY` 增 `tag` 条目：
  title「404 · 标签不存在」/ heading「这个标签不存在」/ hint「它可能还没有已发布的日志，或者链接已经失效。」/
  backHref `/logs` / backText「← 返回日志列表」——文案全常量，不泄露缺的是哪一层（log 条目同口径）。
- 新增 `readTagSegment(pathname)`：`/tags/` 前缀、恰一段、非空、`decodeURIComponent` try/catch 失败回 null
  （`readTenantSegment` 同构）；随后 `normalizeTag` → null 或 `hasPublishedTag` 未命中 → `notFoundResponse("tag")`。
- 响应自带 404 + noindex + no-store（既有函数），发布后同 URL 立即 200 不被缓存（既有注释口径）。
- proxy 仍不 import auth.ts；新增 import 仅 `forms.ts` 的 normalizeTag（纯函数常量表，轻量合规）。
- 内联页四组色值字面量**一字不动**（本轮无令牌变更，手工同步点不触发）。
- 窗口代价：proxy 估 +35 行，前窗口余量 140 → 105，**无需让位**（第五节）。

**B 案（不推荐）：仅页面级 `notFound()`。** 零 proxy 改动，但 PPR 下状态码 200（软 404）：
违反 F13「真 404 带 noindex + no-store」与全站既有口径；无效标签 URL 可被无限构造，
搜索引擎会持续收录 200 的空页。仅当你裁定本轮不动 proxy 时采用，并记 ISSUES 留痕。

---

## 三、功能二：RSS 2.0 订阅（F27 提案）

### 3.1 路由设计

- 文件 `src/app/feed.xml/route.ts`（Route Handler，目录名即 URL 段，F25 导出先例同族）。
- 仅导出 `GET`；公开数据，**无会话校验**（数据源恒 isPublished，访客只读边界不变）。
- cacheComponents 下 GET 默认请求期运行，查库即终止预渲染（官方文档实证，现状第 6 条）——
  **不写 connection()、不写 use cache、不写 dynamic 配置**，与 export route 完全同构。
- 响应头 `Content-Type: application/rss+xml; charset=utf-8`；不加显式 Cache-Control
  （请求期取数，与 sitemap 同口径）；异常走框架 500，**不新造错误码**（I083 教训：路由层错误码
  横幅不可达，不加死码）。
- 空库（0 篇已发布）：200 + 空 channel（合法 RSS），不 404。

### 3.2 数据查询

`getLatestLogs(20)`——全站口径（不传 userId）、`publishedAt desc + beforeDate desc` 兜底、
`publishedAt not null`、带 user.handle 与 project。**零新查询、零 select 改动**；
20 篇上限在 take 参数，不在 XML 层截断。

### 3.3 XML 模板结构（手写模板字符串，零依赖）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Laity 项目档案库</title>                <!-- siteName -->
    <link>https://<正式域名></link>                 <!-- siteUrl() -->
    <description>厂牌官网与开发复盘档案：…</description> <!-- siteDescription -->
    <language>zh-cn</language>
    <lastBuildDate>Wed, 12 Nov 2026 08:00:00 GMT</lastBuildDate> <!-- 首条 publishedAt；空 feed 省略 -->
    <atom:link href="https://<正式域名>/feed.xml" rel="self" type="application/rss+xml" />
    <item>                                        <!-- ≤20 条，按发布时间降序 -->
      <title>…</title>
      <link>https://<正式域名>/u/{handle}/logs/{slug}</link>
      <guid isPermaLink="true">https://<正式域名>/u/{handle}/logs/{slug}</guid>
      <pubDate>Wed, 12 Nov 2026 08:00:00 GMT</pubDate> <!-- publishedAt.toUTCString() -->
      <category>架构</category>                     <!-- 每个 tag 一个，可多个 -->
      <description>…（纯文本摘要，XML 转义）</description>
    </item>
  </channel>
</rss>
```

- `atom:link rel="self"` 是 RSS Advisory Board 最佳实践，命名空间扩展不破坏 RSS 2.0 合法性；
  域名唯一来源 `siteUrl()`，不写死（AGENTS 站点标识单源红线）。
- 日期用 `Date.prototype.toUTCString()`（RFC 822 兼容的 GMT 格式），零依赖、确定性、可单测。
- `lastBuildDate` 取首条 publishedAt（排序保证即最大值）；空 feed 省略该元素——
  不引入 `new Date()` 非确定性，同数据同产物，测试可钉。
- **description 口径（待裁决 ③，推荐摘要案）**：`lessonLearned?.trim() || beforeContent`
  （与详情页 `describeLog` 同优先级）→ 剥 Markdown 成纯文本 → 压缩空白 → 截 200 字符补 `…`。
  不输出 `content:encoded` 全文 HTML：那需要复用 sanitize 管线、窗口与攻击面都涨，
  摘要 +  permalink 已满足订阅器预览与回站阅读。
- 转义：所有文本节点与属性值过 `escapeXml`（`& < > " '` 五字符 + 剥 XML 1.0 非法控制字符
  `\x00-\x08 \x0B \x0C \x0E-\x1F`）；不用 CDATA（转义更简单且可单测）。
  用户内容（标题/标签/正文摘要）是唯一的注入面，转义在纯函数层集中做、测试钉死。

### 3.4 纯函数层 `src/lib/rss.ts`（新增，~110 行）

| 导出 | 职责 | 依赖 |
|---|---|---|
| `escapeXml(text)` | 五字符转义 + 非法控制字符剥除 | 无 |
| `toPlainText(markdown)` | 剥标题/围栏/行内代码/链接图片（保留文字与 alt）/强调/引用与列表标记/HTML 标签，压缩空白 | 无 |
| `buildRssXml(channel, items)` | 组装上方模板；channel 收 `{title, link, description, language, lastBuildDate: Date \| null}`，item 收 `{title, link, pubDate: Date, description, categories}` | 无 |

- **不 import db / next / site**——站点文案与日志行由 route 层组装后传入，纯函数全确定性，
  `node --test` 相对路径直引（`tests/export.test.ts` 先例；@/ 别名在测试里不可用）。
- `toPlainText` 是尽力而为的预览剥离，不是完整 Markdown 解析器（摘要用途足够，局限如实标注）。
- route 层薄壳：`getLatestLogs(20)` → map 成 items（permalink 拼 `siteUrl()`）→ `buildRssXml` → Response。

### 3.5 head 自动发现

`src/app/layout.tsx` 的 `metadata` 增：

```ts
alternates: {
  types: { "application/rss+xml": "/feed.xml" },
},
```

官方文档原样范例（现状第 8条）；`metadataBase` 已就位 → 全站每页渲染
`<link rel="alternate" type="application/rss+xml" href="<siteUrl>/feed.xml" />`。
不手写 `<head>` 标签、不加客户端组件——Metadata API 即框架正道，效果与任务要求逐字等价。

---

## 四、依赖评估：零新增

| 候选 | 许可 | 结论 |
|---|---|---|
| `feed` / `rss` 等生成库 | MIT | **不引入**：RSS 2.0 子集小（channel + item 共 9 种元素），手写 ~110 行纯函数全覆盖且可单测；引入即触发报批 + linux 容器重算 lockfile（I018）+ licenses.ts/测试同步，成本大于收益 |
| XML 转义库 | — | 不需要：五字符替换 + 控制字符剥除是 ~10 行纯函数 |
| 日期格式化库 | — | 不需要：`toUTCString()` 内置且 RFC 822 兼容 |

D36（导出 JSON 零依赖）先例同口径。不触发 AGENTS「新增依赖」流程；无 GPL/AGPL 风险面。
本轮也不改 build/CI/lockfile、不加环境变量、不动 schema。

---

## 五、软著窗口影响（实测基线 3af93f2，2026-11-12）

### 5.1 基线（探针与生成器自报逐项对拍一致）

| 项 | 实测 |
|---|---|
| 总行数 / 总页数 / 收录 | 10284 / 206 / 82 |
| 前窗口 | 第 1–1500 行；①+② = 1360 行（proxy.ts 止于 1360），**余量 140** |
| 后窗口 | 第 8801–10284 行；容量按整页折算 **1484**；④ = 1305 行（globals.css 起于 8980），**余量 179** |
| 折走段 ③ | 7300 行 |

### 5.2 新文件登记位（BANDS）

| 新文件 | 段 | 理由 |
|---|---|---|
| `src/app/tags/[tag]/page.tsx` | ④ | 访客可见界面，与大厅/详情同类 |
| `src/app/feed.xml/route.ts` | ③ | 与 sitemap.ts / robots.ts / export route 同族（对外出口层） |
| `src/lib/rss.ts` | ③ | 与 highlight / export / toc 同族（纯函数，调用方在 ③④ 可见），不动 ①+② |

### 5.3 行数预算（估算，含文件头修改记录与分隔行；最终以 assertWindowFit 实测为准）

| 文件 | 段 | 估增 | 内容 |
|---|---|---|---|
| `src/proxy.ts` | ② | +35 | tag 文案条目、readTagSegment、分支、matcher、文件头 |
| `src/lib/rss.ts`（新） | ③ | +112 | 三纯函数 + 文件头 |
| `src/app/feed.xml/route.ts`（新） | ③ | +57 | GET 薄壳 + 文件头 |
| `src/lib/logs.ts` | ③ | +15 | hasPublishedTag + 文件头 |
| `src/lib/forms.ts` | ③ | +20 | normalizeTag + 文件头 |
| `src/app/tags/[tag]/page.tsx`（新） | ④ | +142 | 页面 + metadata + 文件头 |
| `src/app/layout.tsx` | ④ | +5 | alternates + 文件头 |
| `src/app/logs/page.tsx` | ④ | +9 | 列表行标签链接化 + 文件头 |
| `src/app/u/[handle]/logs/[slug]/page.tsx` | ④ | +9 | header 标签链接化 + 文件头 |

合计：② +35、③ +204、④ +165 → 总行数 ~10688 → 214 页 → 后窗口容量 1488 → ④ 1470，**名义余 18 行**；
前窗口 1395，**余 105 行，无需让位**。

### 5.4 翻页敏感性与让位预案

后窗口容量随总页数非线性变化：总行数若落在 10651–10750 区间，容量在 1451–1500 之间摆动，
**最坏缺口约 19–30 行**（估算误差 ±20 行即可触发）。预案按序：

1. **先压缩标签页**（目标 ≤120 行：去冗余注释与空行，形态不减）；
2. 仍超则**让位候选：`src/app/page.tsx`（首页，187 行）自 ④ 平移 ③**——判据与 F23 租户主页先例同构：
   取数逻辑 `getArchiveBoard`（②projects.ts）与 `getLatestLogs`（③logs.ts）均整份可见，折走的是排版。
   **Timeline（F02 点名形态）、SiteNav、globals.css、layout、大厅、详情页全部保留可见**；
3. 让位遵循「先报后动」：护栏拒件时停下报被切文件与行范围，等你点名，独立 commit。

若裁决 ② 选「sitemap 收录标签页」：③ 再 +12 行，敏感性加剧（总行数 10700 恰好整页，多 1 行即翻 215 页），
让位概率上升——这也是推荐本轮不收 sitemap 的原因之一。

### 5.5 说明书与材料纪律

- 说明书现 591 行 / 20 页；预计 +15~25 行 → 21 页（<60 全提交）。**小节编号不新增**（项目纪律）：
  标签聚合并入 4.2（大厅延伸段）、标签链接并入 4.3、RSS 发现与订阅并入 4.5、第十节删「订阅源」。
- 每个动收录文件的 commit 必重出两份 HTML 并同批提交（CI `git diff --exit-code` 门禁）；
  生成器本轮已验证幂等（零源码改动 → 零 diff）。
- 材料交付前照例跑凭据扫描（先注入伪凭据自证扫描器有效）。

---

## 六、测试与验收

### 6.1 新增纯逻辑测试（node --test，零测试依赖）

- `tests/rss.test.ts`（新，~14 条）：escapeXml 五字符逐个 + 控制字符剥除 + 正常文本不变；
  toPlainText 标题/链接/图片/围栏/强调/空白压缩/200 截断；buildRssXml channel 字段、item 数、
  guid=isPermaLink、pubDate RFC 822 形状正则、转义集成（注入 `<&"` 的标题/标签）、空 items、多 category。
- `tests/forms.test.ts`（增 ~4 条）：normalizeTag trim / 空→null / 超 24→null / 大小写与 `%` 原样保留（不解码）。
- 基数 131 → 预计 ~149，**以实跑为准**；每条带基数自证，文件系统断言自证能红（既有纪律）。
- 覆盖边界如实说：DAL、proxy、route、页面渲染不在单测内，靠 6.2 人工联调，不用全绿代替。

### 6.2 浏览器实测清单（dev + 本地库真数据；四道门禁全 0 后）

第 2、3 条按裁决 ① A 案验收；若裁 B 案则改验软 404 页面内容并把口径缺口记 ISSUES。

1. `/tags/<已有中文标签>` 200；行数 = 大厅 `?tag=` 筛选行数；行标题链接指 `/u/[handle]/logs/[slug]`。
2. `/tags/<不存在标签>` **真 404**：status 404 + `x-robots-tag: noindex` + `cache-control: no-store` + 「标签不存在」文案。
3. `/tags/<纯草稿标签>` 404，文案不泄露草稿存在。
4. 大厅列表行标签点击 → 聚合页；**筛选 chip 点击仍是筛选**（回归）；details 折叠正常（回归）。
5. 详情页 header 标签点击 → 聚合页。
6. `/feed.xml` 200 + Content-Type；DOMParser 解析无 parsererror；item ≤20；pubDate 形状；link/guid 绝对 URL。
7. 任一前台页 head 存在 `link[rel="alternate"][type="application/rss+xml"]`，href 为绝对 URL。
8. 标签页 `aria-current` 0 处、棕色下划线 0 处；新链接键盘焦点 2px 主墨框。
9. 标签页 Timeline 窄/宽容器成对量几何（第六调用点 @container 生效）。
10. I074 教训：导航类判据用生产构建或硬加载，不用热更中的 dev 壳。

### 6.3 未验证项（如实标注，不推断补全）

- 外部 RSS 阅读器（Feedly 等）真实订阅未测——外部服务，需你批准后才碰。
- W3C Feed Validator 未跑（同上）；XML 良构由 DOMParser + 单测保证，规范符合性按 RSS 2.0 spec 逐元素自查。
- 生产编排下的 /feed.xml 与 /tags 实跑未测（服务器动作只出步骤清单，你本人执行）。

---

## 七、文档同步清单（实施收口轮，本轮一字未动）

| 文档 | 改动 |
|---|---|
| SPEC.md | 「已实施增补」新增 F26/F27（先记「已裁决待实施」）；追溯矩阵补两行（I082 修复后矩阵随增随补）；**非目标清单第 5 条删「RSS」**（本任务点名即解禁授权）；范围区间 F19–F25 → F19–F27；回归测试数改实测 |
| DESIGN.md | 新增 D37（标签聚合：精确匹配口径 + proxy 真 404 + 链接落点）、D38（RSS：手写 XML 零依赖 + 摘要口径 + 请求期取数 + alternates 注入）；决策索引 D1–D38 |
| 软件操作说明书.md | 4.2/4.3/4.5 并入新能力描述（不新增小节编号）；第十节删「订阅源」 |
| README.md | 状态快照同步 |
| AGENTS.md | **预计无需改动**：无新技术栈/环境/红线事实，视觉铁律不变（标签链接不用棕色、无新令牌）。实施中若产生新事实，停下报你点名 |
| ISSUES.md | 预计无新增；实施中发现范围外问题照规则登记 |

---

## 八、分几步 Commit（每步停下报 diff 摘要，等你点名再走下一步）

1. **RSS 纯函数层**：`src/lib/rss.ts` + `tests/rss.test.ts` + BANDS 登记（③）+ 材料重出。
2. **RSS 接线**：`src/app/feed.xml/route.ts` + `layout.tsx` alternates + BANDS 登记 + 材料重出。
3. **标签数据层**：`forms.ts:normalizeTag` + `logs.ts:hasPublishedTag` + tests 增补 + 材料重出。
4. **标签页与链接**：`tags/[tag]/page.tsx` + 大厅/详情标签链接化 + BANDS 登记（④）+ 材料重出（窗口护栏首检）。
5. **真 404**（裁决 ① 选 A 时）：proxy tag 分支 + 材料重出（前窗口判定）。
6. **文档收口**：SPEC/DESIGN/说明书/README + 材料重出 + 报备项清理（若你确认）。

顺序理由：纯函数先行（可测）→ 接线 → 页面 → 守卫 → 文档。中间态仅存在于 dev
（如第 4 步后标签页暂为软 404，第 5 步收口），每个 commit 自身四道门禁全 0。
提交由你执行或你点名授权；说提交不等于说 push。

---

## 九、待裁决点与报备

**待裁决（3 项，裁断前不落对应代码）**

| # | 问题 | 推荐 | 备选 |
|---|---|---|---|
| ① | 标签页 404 口径 | **A：proxy 前置真 404**（F13 同口径，前窗口余量足够，无需让位） | B：页面级软 404（零 proxy 改动，但 200 状态码违反全站口径，SEO 不利） |
| ② | sitemap 是否收录标签页 | **本轮不收**（衍生聚合页，大厅已覆盖全部日志 URL；省 12 行并降低翻页敏感） | 收录（+12 行，lastModified 取该标签下最新 updatedAt；让位概率上升） |
| ③ | RSS description | **200 字符纯文本摘要**（lessonLearned 优先，与详情页 meta 同优先级） | content:encoded 全文 HTML（需复用 sanitize 管线，窗口与攻击面都涨，不推荐） |

**报备（发现但未动，等你裁定）**

1. **大厅链接落点解读**：任务说「日志大厅的标签上增加链接」——大厅有两处标签，本方案改**列表行内标签**，
   筛选区 chip 保持筛选交互不动（改 chip 会破坏 F03）。若你本意是 chip 也要跳聚合页，请点名，我重出该节。
2. **SPEC 非目标第 5 条与说明书第十节的「全文搜索/全文检索」半句已漂移**（V2.1 已实施全局搜索，
   `searchLogs`/`matchLog` 在库）。本轮删「RSS/订阅源」是任务授权；同句的「全文搜索」是否一并删
   （同源衍生清理），**等你确认**；不确认则只删 RSS、漂移记 ISSUES。
3. **SPEC 回归测试数仍写 113**（2026-11-11 口径），实测 131——F24/F25 轮未同步该行。
   实施收口时按实测改（131 + 本轮新增），此属 I071/D32「文档数字对拍」纪律的既定动作。
4. **另三处标签展示点**（首页/租户主页/项目详情的最新日志行）本轮不接线（范围外，2.4 已列锚点），
   是否扩大等你点名。

---

## 十、边界（本轮与实施轮都不做）

- 不动导航三项与 SiteNav；不引入新色值/令牌（标签链接不用棕色）；不动 proxy 四组色值字面量。
- 不抽共享列表组件（三处内联）；不做标签管理/改名/合并/去重（入库口径不动）。
- 不做 RSS 全文输出、分页、按项目/租户的多 feed；不做评论/点赞等非目标清单其余项。
- 不改 build/CI/lockfile；不加依赖；不改 schema/迁移；不加环境变量；不动 D5 摘要口径。
- 不 push、不代执行外部动作；材料让位「先报后动」。