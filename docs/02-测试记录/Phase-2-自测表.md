# Phase 2 自测表：前台三页完整版 + 安全封装

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 2 验收标准
说明：粘贴真实执行输出；数据库未就绪的运行期项目如实标注，等 WSL2 解除后回填。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | 草稿隔离：/、/logs 不出现，直访详情 404 | 造 isPublished=false 数据后访问三页 | 均不可见，详情 404 状态码 | 未执行：数据库未起。404 状态码改由 src/proxy.ts 前置判定（D7），判定分支同样需要连库，待库起后回填；框架层"直接返回 Response 保留 404"已实测（见第七节） | 未验证 |
| 2 | 详情页显示 contentHash 与 publishedAt | 访问 /logs/prebuild-index | 显示哈希与 UTC 时间 | 未执行：数据库未起；种子已按 D5 口径在 seed 中计算 contentHash | 未验证（代码就绪） |
| 3 | 含 `<script>` 的正文渲染无脚本执行 | 见第二节渲染管线验证 | 无 script 标签、无 onerror、无 javascript: 链接 | `HAS_SCRIPT_TAG: false` / `HAS_ONERROR: false` / `HAS_JS_PROTOCOL: false` | PASS（组件级）；浏览器级待回填 |
| 4 | 视觉铁律 grep 零命中 | `grep -rnE "rounded-(?!none)\|shadow-(?!none)\|bg-gradient\|lucide\|react-icons\|heroicons" src/` | 零命中 | `ZERO_MATCH` | PASS |
| 5 | 375px 宽度三页无横向滚动 | 浏览器 DevTools 375px | 无横向滚动条 | 未执行：数据库未起，页面只能看到骨架 | 未验证 |
| 6 | lint 零 error、build 通过 | `npm run lint` / `npm run build` | 零 error；退出码 0 | lint 无任何输出；build 输出见下 | PASS |

build 实际输出（结尾路由表）：

```
Route (app)
┌ ◐ /
├ ○ /_not-found
├ ◐ /logs
└   /logs/[slug]
  └ ◐ /logs/[slug]
```

## 二、Markdown 渲染管线验证（组件级）

用 `react-dom/server` 渲染 `<ReactMarkdown rehypePlugins={[rehypeSanitize]}>`，输入含
`<script>alert(1)</script>`、`<img src=x onerror=alert(1)>`、`[危险链接](javascript:alert(1))`：

```
<div><h1>标题</h1>
<p>正文 alert(1) 结束</p>
<p><a>危险链接</a></p>
<p><strong>加粗</strong> 正常文本</p></div>
HAS_SCRIPT_TAG: false
HAS_ONERROR: false
HAS_JS_PROTOCOL: false
```

结论：原始 HTML 直接丢弃（react-markdown 默认不解析 HTML），sanitize 再兜底移除
危险协议与事件属性；`alert(1)` 仅作为纯文本出现，不执行。临时脚本已删除，未入库。

## 三、字体与主题核查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 三套字体接入 | next/font（Inter / Noto Serif SC / JetBrains Mono） | PASS，构建时从 Google Fonts 拉取成功 |
| 中文字形真实落地 | `ls -lh .next/static/media` | PASS：约 6.3MB woff2，多个 50–100KB 分片，符合 Noto Serif SC 的 unicode-range 中文分片特征，不是只有拉丁子集 |
| 正文排版 | `.log-body` | 18px / 行高 1.85 / 宋体栈，符合 AGENTS.md |
| 色值 | token：paper #FBFBF9、ink #131313、ink-soft #5C5C5C、hairline #E7E7E2 | 与铁律一致，页面用 token 不写字面色值 |

## 四、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 新增依赖 | package.json diff | 经批准新增 react-markdown@10.1.0（MIT）、rehype-sanitize@6.0.0（MIT）；传递依赖 84 个包，83 个 MIT + 1 个 ISC（@ungap/structured-clone，宽松许可，非 GPL 系） |
| lockfile | git diff | package-lock.json 因安装上述依赖变更——属获批依赖的必然结果，非擅自改动 |
| 越界文件 | 对照 DESIGN.md Phase 2 清单 | 多改 prisma/seed.ts（Phase 2 验收第 2 条要求种子数据带合法哈希，D5 口径现算）；新增 src/proxy.ts 经你批准并已补进 DESIGN.md 的 Phase 2 清单（D7）；其余均在清单内，未提前建 Phase 3 的 projects 数据层 |
| 配置变更 | — | 详情页新增 `export const instant = false`：只解决"未发布 slug 的查询发生在静态壳断言期"导致的构建报错，**不产生 404 状态码**（先前理解有误，已在第七节更正）；属路由段配置，非 build/CI 配置 |
| 密钥入库 | git status | `.env` 仍被忽略，未入库 |

## 五、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts/.tsx 均有文件头注释 | PASS（markdown.tsx、Timeline、StatusBoard、Seal、logs/[slug]/page.tsx） |
| 修改文件追加修改记录行 | PASS（layout、globals、page、logs/page、logs.ts、seed.ts） |
| docs/01 有本 Phase 研发日志 | 已追加 |
| docs/03 带地址栏截图 | 待补：数据库起后截三页 + 375px |
| 独立 commit | 主体已提交 3affc81（未推送）；Proxy 补充改动待运行期回填后单独提交 |

## 六、404 状态码专项排查（补充）

验收第 1 条要的是"返回 404"，不是"显示 404 页面"。实测发现两者在本项目里不是一回事，记录全过程：

| 探针 | 做法 | 结果 |
|---|---|---|
| A | 详情页 `notFound()` + `export const instant = false` | 构建通过，但 `curl` /logs/[slug] 返回 **200**，正文是错误页（`<html id="__next_error__">`）；服务端日志为 Prisma `Can't reach database server`，属流式已开始后出错 |
| B | Proxy 里 `NextResponse.rewrite(url, { status: 404 })` | **200**——`rewrite()` 会把 init 摊进响应，但被重写到的路由自身状态码覆盖 |
| C | Proxy 里直接 `new NextResponse(html, { status: 404 })` | **404**，状态码与正文都保留 |
| D | 正式 Proxy（连库，数据库当前不可用） | `/` 200、`/logs` 200、`/logs/prebuild-index` 500、`/logs/not-a-real-slug` 500 |

结论：
- 按 node_modules/next/dist/docs 的 loading.md、not-found.md：流式响应固定以 200 开头，`notFound()` 只在正文开始流式**之前**调用才保留 404；本项目开了 Cache Components（pPR），详情页有静态壳，正文必然晚于响应头。官方给出的动态路由真 404 处方就是 Proxy 前置检查。
- `instant = false` 的作用只是让详情页整体阻塞渲染、让未缓存查询合法，**并不产生 404 状态码**；先前自测表把它写成"能返回真 404"是错的，本节更正。
- 因此按 D7 落地 [src/proxy.ts](../../src/proxy.ts)：matcher 只匹配 `/logs/:slug`，用 `isPublishedLogSlug()` 做一次 `select id`，未命中返回探针 C 验证过的 404 页（纸白、零圆角、零阴影、无图标、noindex、no-store）。
- 判定边界：探针 D 的 500 是"数据库不可用 → 诚实失败"，不是缺陷；它同时证明 Proxy 里那段 Prisma 查询是真的执行了（服务端日志出现 `Can't reach database server at localhost:5432`），不是空壳。404 分支和 200 分支都要连库才能验，因此本表第 1 条仍记未验证，等 WSL2 就绪后回填。

## 七、结论

- 判定：**条件性 PASS**——代码、构建、lint、视觉、清洗、字体六项通过；运行期三项（草稿隔离、印章展示、375px）因数据库未起未验证。
- Proxy 补充后重跑：`npm run lint` 无输出、`npm run build` 退出码 0，路由表新增 `ƒ Proxy (Middleware)`。
- 解除阻塞动作：WSL2 装好后 `docker compose up -d` → `npx prisma migrate dev` → `npx prisma db seed` → 回填第 1/2/5 条（含第 1 条的状态码与草稿隔离）→ 截图 → 独立验收 → commit。
- 范围外发现：I006——.gitignore 的 `logs` 规则把 `src/app/logs/` 整个忽略，Phase 1 的日志大厅与本次详情页此前都未入库；本 Phase 提交时已用 `!src/app/logs/` 重新纳入并核对 `git status`。I004 仍开放。
