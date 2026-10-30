# Phase 5a 自测表：作品维度页面

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 5 交付物的前半段（F11 项目列表 / 项目详情）
说明：Phase 5 的 OSS 传图（F10）需要我本人先开通 Bucket 并配 RAM 密钥，属外部账号动作，本轮按拍板拆成 5a 先做项目页、5b 待 OSS 就绪再做。表内全部为真实执行输出。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | `/projects` 列出全部项目（含一条没有任何日志的项目） | 库里临时建 `probe-empty`（`探测·空项目`，`LIVE`，零日志），`npm run start` 后 `curl /projects` 并剥离标签读文本 | 种子项目与空项目同时出现，空项目计数为 0 | `0 LOGS`、`1 LOGS`、`地球 Mirror`、`探测·空项目` 四项各命中一次；空项目那行为 `0 LOGS` | PASS |
| 2 | `/projects/[slug]` 显示该项目已发布日志 | `curl /projects/earth-mirror` | 页头有 slug/类型/状态/SINCE/日志数，正文列出已发布那条 | `地球 Mirror`、`SINCE 2026-10-30`、`1 LOGS`、标题 `决定放弃本地搜索，改用索引预构建` 均出现（RSC payload 里同一标题也在，属正常序列化） | PASS |
| 3 | 草稿仍不可见 | 建 `probe-draft-log`（`isPublished: false`，挂在 `earth-mirror` 下），再抓 `/`、`/logs`、`/projects`、`/projects/earth-mirror` | 四个页面都不出现草稿标题；`/logs/probe-draft-log` 为 404；项目计数不被草稿抬高一格 | `grep -c 探测·草稿标题`：`/` → `0`、`/logs` → `0`、`/projects` → `0`、`/projects/earth-mirror` → `0`；`/logs/probe-draft-log` → `404`；首页看板仍为 `地球 Mirror PRODUCT WIP 1 LOGS · 2026-03-12` | PASS |
| 4 | 无任何日志的项目详情页走空状态 | `curl /projects/probe-empty` | 显示 `NO LOG YET` 而不是报错 | `0 LOGS`、`NO LOG YET`、`探测·空项目`、`SINCE 2026-10-30` | PASS |
| 5 | 不存在的 slug 返回 404 状态码（DESIGN 5a 第 3 条，批准后新增） | 扩 Proxy 后 `curl -w %{http_code} /projects/no-such-project`，并抓响应头与剥标签正文 | 404 + noindex/no-store + 项目文案 | `404`；头 `content-type: text/html; charset=utf-8`、`x-robots-tag: noindex`、`cache-control: no-store`；正文 `404 · 项目不存在 / 这个项目不存在 / 链接可能失效了，也可能这个项目还没有进档案库。 / ← 返回项目列表`；对照组 `/logs/no-such-log` → `404` 仍是日志文案 | PASS（首测为 200，见第二·补节） |
| 6 | 已发布内容无回归 | `curl -o /dev/null -w %{http_code}` 逐个路由 | 首页/大厅/详情/后台按预期 | `/` 200、`/logs` 200、`/logs/prebuild-index` 200、`/logs/draft-nope` 404、`/admin` 307、`/projects` 200、`/projects/earth-mirror` 200 | PASS |
| 7 | `npm run lint` / `npm run build` 通过 | 实跑（Proxy 扩项后再跑一遍） | 零 error、构建成功 | 首轮：`> eslint` 无输出（`lint_exit=0`）、`✓ Compiled successfully in 1602ms`、`Finished TypeScript in 2.1s`、`✓ Generating static pages using 14 workers (12/12)`、`build_exit=0`。改 Proxy 后重跑：lint 退出 0、`npx tsc --noEmit` 退出 0、`✓ Compiled successfully in 964ms`、`Finished TypeScript in 1344ms`、`✓ Generating static pages using 14 workers (12/12)`、路由表仍含 `ƒ Proxy (Middleware)` | PASS |

build 路由表（新增部分）：

```
├ ƒ /projects
└   /projects/[slug]
  └ ◐ /projects/[slug]

ƒ Proxy (Middleware)
```

`◐` = Partial Prerender：静态壳加流式动态段；`ƒ` = 每次请求服务端渲染。

## 二、未验证项与替代验证

| 项 | 状态 | 说明 |
|---|---|---|
| 不存在的 slug 真返回 404 | **通过（经批准后补齐）** | 首测确实不合格：`/projects/no-such-project` → `200`，正文首行 `<html id="__next_error__">`（与 Phase 2 第六节探针 A 同因——Cache Components 的静态壳已用 200 发出响应头，页面级 `notFound()` 换不了状态码）。经我批准扩 Proxy 后复测：`/projects/no-such-project` → `404`，响应头 `content-type: text/html; charset=utf-8`、`x-robots-tag: noindex`、`cache-control: no-store`，剥标签正文为 `404 · 项目不存在 / 这个项目不存在 / 链接可能失效了，也可能这个项目还没有进档案库。 / ← 返回项目列表`；对照组 `/logs/no-such-log` → `404` 且仍是日志文案，未互相污染 |
| 375px 无横向滚动 | 已测（探针代替人眼） | 在 375px 隐藏 iframe 内量 `documentElement.scrollWidth` 与越界元素：`/projects` `scrollWidth=360`、`/projects/earth-mirror` `360`、`/projects/probe-empty` `375`，`overflowing` 三页均为空数组。应用内浏览器截不了带地址栏的图，docs/03 截图仍待我本人补 |
| OSS 传图（F10，Phase 5 验收第 1、2 条） | 本轮未做 | 前置动作是外部账号与计费操作，DESIGN 写明由我本人执行；`src/lib/oss.ts`、`src/app/admin/upload-action.ts`、`next.config.ts` 的 remotePatterns 一个都没动 |

## 二·补 Proxy 扩项后的回归（2026-10-30 批准 I015 后实跑）

`npm run lint` 无输出、`npx tsc --noEmit` 退出 0、`npm run build` 退出 0（路由表不变，仍含 `ƒ Proxy (Middleware)`）。`npm run start` 后逐个 `curl -w %{http_code}`：

| 路由 | 状态码 | 判读 |
|---|---|---|
| `/` | 200 | 首页未受影响 |
| `/logs` | 200 | matcher `/logs/:slug` 不含列表页 |
| `/logs/prebuild-index` | 200 | 已发布日志详情正常放行 |
| `/logs/no-such-log` | 404 | 原有守卫未退化，文案仍是"这条日志不存在" |
| `/projects` | 200 | matcher `/projects/:slug` 不含列表页 |
| `/projects/earth-mirror` | 200 | 真实项目放行 |
| `/projects/earth%2Dmirror` | 200 | `decodeURIComponent` 生效，编码写法同样命中 |
| `/projects/no-such-project` | **404** | 本次修复目标，文案为"这个项目不存在" |
| `/admin` | 307 | 鉴权分支未被新前缀分支影响 |

再造两条探针验证"项目公开但日志仍隔离"的边界：建 `probe-draft-only`（项目）+ `probe-draft-log`（`isPublished: false`）→ `/projects/probe-draft-only` `200` 且正文只有 `NO LOG YET`（项目存在，Proxy 放行）；`/logs/probe-draft-log` 仍 `404`（草稿不外泄）；`/projects` 列表里该项目显示 `0 LOGS`，草稿没有把计数抬高。测完删探针，库回到 `[{"projects":1,"logs":1}]`，只结束本仓库的 node 进程（`killed 50828`，端口 `after_kill=000`）。


## 三、视觉铁律与红线

| 检查项 | 方式 | 结果 |
|---|---|---|
| 圆角/阴影/渐变/图标库 | `grep -rnP "rounded-(?!none)\|shadow-(?!none)\|bg-gradient\|lucide\|react-icons\|heroicons\|dangerouslySetInnerHTML" src/` | `ZERO_MATCH`（全 src 零命中） |
| 硬编码色值 | `grep -rn "#[0-9a-fA-F]{3,8}" src/app/projects src/lib/projects.ts` | `ZERO_HEX`，只用 `text-ink`/`text-ink-soft`/`border-hairline`/`border-ink` 四个 token |
| 数据访问分层 | `grep -rn "db\.\(log\|project\)" src/app src/components`；`grep -rn "@/lib/db" src/app src/components` | 均 `ZERO_MATCH`；`new PrismaClient` 只在 `src/lib/db.ts` 一处 |
| 前台草稿隔离 | 两个新页面的日志数据一律走 `getSafeLogs()`；项目字段用显式白名单 `select`，不取 `id` | 成立；项目表本身无发布开关，故公开面只暴露 slug/名称/类型/状态/简介/仓库地址（+详情页的 `createdAt`） |
| 越界文件 | `git diff --stat HEAD` + `git status --short` | 代码动了 4 个文件：新建 `src/app/projects/page.tsx`、`src/app/projects/[slug]/page.tsx`，修改 `src/lib/projects.ts`（两个公开查询 + Proxy 用的 `isProjectSlug`）、`src/proxy.ts`（matcher 加 `/projects/:slug`）。两处清单外都有来由：AGENTS.md 禁止页面直查库，公开查询必须有 src/lib 落点；404 状态码只有 Proxy 能给——均已获我批准并写进 DESIGN 的 5a 清单与 D7。未动 `next.config.ts`（本轮无 OSS） |
| 新增依赖 / 配置 / lockfile | `git status` | 无（`package.json`、`package-lock.json`、`next.config.ts`、`tsconfig.json` 均未动） |
| `.env` 与密钥 | `git status --short` | 工作区只有代码与文档，`.env` 仍被忽略，无密钥入库 |
| 探针数据清理 | 删 `probe-empty`、`probe-draft-log` 后 `SELECT count(*)::int` | `[{"projects":1,"logs":1}]`，回到种子状态 |

## 四、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .tsx 有文件头注释 | 两个页面均有（文件/描述/作者/创建日期/修改记录） |
| 修改的旧文件追加修改记录 | `src/lib/projects.ts` 头部描述改为"项目数据访问：管理侧…；公开侧…"，追加一行 `- 2026-10-30: Phase 5a 补 listPublicProjects / getPublicProjectBySlug`，未覆盖原记录 |
| docs/01 研发日志 | 第十三节（Phase 5 拆段、被自己重复定义的函数绊了一次、先测出不存在 slug 返回 200、批准后按 D7 扩 Proxy 并做九条路由回归） |
| 独立 commit | 待提交（含 DESIGN 与 ISSUES 的同步） |

## 五、结论

- 判定：**Phase 5a PASS**——项目维度两页按 SPEC F11 落地，草稿隔离、空项目、无回归、lint/build、视觉与分层红线全部实测通过；带地址栏截图待我本人补。
- **一条先失败后修好的**：`/projects/[slug]` 首测对不存在的 slug 返回 200（软 404）。我没有去改已验收文件的边缘行为糊过去，而是停下报告根因并等你批准；批准后按 D7 同一路数扩 Proxy，复测为真 404，且 `/logs`、`/admin`、已发布详情全部无回归（见第二·补节）。I015 转 FIXED。
- 下一步：OSS Bucket + RAM 密钥就绪后做 Phase 5b（`src/lib/oss.ts`、`upload-action.ts`、编辑器插图中转、`next.config.ts` 的 `images.remotePatterns`）。届时新增依赖要单独报批（含许可证）。
