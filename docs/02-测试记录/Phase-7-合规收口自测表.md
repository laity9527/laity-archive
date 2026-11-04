# Phase 7 合规收口自测表（单人站可做的部分）

日期：2026-11-03
输入：`C:\Users\28335\Downloads\Laity合规需求设计方案.md`（v1.0，多用户平台口径）
裁决与逐条对照：`docs/00-开发方法论/合规需求差距分析与分期方案.md`、DESIGN D19
范围：只吸收与"单人档案库"定位无关、且零新依赖的合规项。多用户平台整块留作 Phase 9 备选，本轮未动 schema。

---

## 一、本轮做了什么（六件）

| # | 事项 | 落点 |
|---|---|---|
| 1 | 发布前敏感信息扫描 + `LOG_003` 确认门 | `src/lib/sensitive-scan.ts`、`src/lib/publish.ts`、`src/app/admin/log-actions.ts`、编辑页 |
| 2 | 日志彻底删除（回填 slug 确认，`LOG_004`） | 同上 + `src/app/admin/page.tsx` 结果提示 |
| 3 | 对外文案中性化（不暗示法律效力；对内保留"证据链"叙事） | `site.ts`、`layout.tsx`、`Seal.tsx`、`logs/page.tsx`、`logs/[slug]/page.tsx` |
| 4 | `/licenses` 开源许可与致谢 + 商标声明 | `src/lib/licenses.ts`、`src/app/licenses/page.tsx` |
| 5 | 页脚三项合规位（公安备案号、对外邮箱、版权行）与容器注入修复 | `SiteFooter.tsx`、`site.ts`、`docker-compose.prod.yml`、两份 env 模板 |
| 6 | 个人信息与凭据泄露应急预案 | `docs/00-开发方法论/个人信息与凭据泄露应急预案.md` |

新依赖：0。schema 变更：0。迁移：0。

## 二、验收判据与实测输出

| # | 判据 | 实测 |
|---|---|---|
| 1 | 扫描器九类形态命中、摘要与版本号不误判、邮箱不拦发布 | `node --test tests/sensitive-scan.test.ts` → 14 条全绿。含三条专门的反例：64 位 contentHash、以手机号数字串开头的 40 位 SHA、`Next.js 16.4.3 发布于 2026-11-03，构建耗时 1234ms` 均零命中 |
| 2 | 阻截级命中时发布被服务端拒绝 | 类型与契约已接（`publishLog` 返回 `LOG_003`，动作透传 `sensitiveConfirmed`）；**端到端点击未验**——需要我本人在浏览器登录后台 |
| 3 | 删除需回填 slug，不符则不执行 | `deleteLog(id, confirmSlug)` 先比对后删除，不一致返回 `LOG_004`；**端到端未验**（同上） |
| 4 | 许可清单与 package.json 不漂移、无传染性许可 | `tests/licenses.test.ts` 4 条全绿：18 个直接依赖逐个对拍、无废弃条目、无 GPL/AGPL/LGPL 前缀、每条都有用途。许可值来自 `node_modules/<包>/package.json` 的 `license` 字段实测（MIT 14 / Apache-2.0 3 / ISC 1） |
| 5 | 对外页面不再出现"存证/防伪"字样 | `curl /` → 标题含"开发复盘档案"；`curl /logs` → 描述含"SHA-256 摘要"、"存证"计数 `0`；`curl /logs/prebuild-index` → "内容摘要" `2`、"存证印章" `0` |
| 6 | `/licenses` 可访问且进 sitemap | `curl -o /dev/null -w %{http_code} /licenses` → `200`；构建路由表 `○ /licenses`（静态预渲染）；`curl /sitemap.xml` 含 `/licenses` |
| 7 | 三项合规位未配置就不渲染 | 页脚 grep "侵权投诉" 计数 `0`（`SITE_CONTACT_EMAIL` 未填）；备案号两行同理不渲染 |
| 8 | 合规位变量真能进容器 | `docker compose --env-file tmp/prod-dummy.env -f docker-compose.prod.yml config --quiet` → 退出 0（模板里缺两个新键也不报错），渲染结果含 `SITE_ICP: ""`、`SITE_POLICE_ICP: ""`、`SITE_CONTACT_EMAIL: ""` |
| 9 | 四道门禁 | `npm test` 48/48、`npx tsc --noEmit` 0、`npm run lint` 0、`npm run build` 0 |
| 10 | 软著材料窗口不被切口打断 | 生成器 `assertWindowFit()` 通过：36 个"必须整份可见"文件全部整份在窗口内；独立脚本只读产物 HTML 复核 21 个关键文件，全部"分隔行与末行同窗口" |

## 三、过程中真正发现的问题

**`SITE_ICP` 从来没有被传进应用容器。** `docker-compose.prod.yml` 的 `app.environment` 只列了数据库、认证、OSS 三类变量，合规位一个都没有——而 compose 的 `--env-file` 只参与变量插值，不会自动把变量注入容器。后果是：我在 `.env.production` 里填好备案号，页脚那一行也永远不显示，而手册第一节的判据恰恰写着"打开首页页脚能看到备案号"。这条判据在补修之前是**不可能成立**的。

修法与口径：补三行显式传递，并用 `${VAR:-}` 而不是 `${VAR:?}`——未备案、还没有公开邮箱时留空是合法状态，硬卡会把整个 `up` 拦死。

第二个发现是来源方案本身的一处技术错误：它把"仅申请 `public_repo` 和 `read:user`"当作最小权限，而 `public_repo` 是**可写** scope，只读公开仓库元数据不需要任何 repo scope。本站未声明 scopes，走 NextAuth 默认 `read:user user:email`（已在浏览器授权 URL 实测），本身已比方案要求更小。照抄反而扩大权限。

## 四、明确不做（避免半成品与虚假承诺）

邮箱注册与密码找回（需 SMTP + 口令哈希库）、手机号验证码（需短信资质与费用）、图形验证码、内容安全 API（付费）、GitHub Webhook 同步与 Token 加密存储、租户隔离、管理员分角色与审计日志、数据导出、账号注销流程、`/privacy` 之外的另外三张法律页（用户协议 / 侵权投诉指引 / 社区规范）。

理由统一：它们的前提是"多用户 + 第三方投稿"，本站不存在该前提；在没有注册系统的产品上写《用户服务协议》与"投诉处理时效"，属于对外虚假陈述，比不写更糟。逐条对照与分期见差距分析文档第四节。

## 五、未验证与待办

1. 第 2、3 条判据的端到端点击：需我本人在浏览器登录后台（同一处阻塞还卡着 5b 的上传联调——本地 `.env` 的 `GITHUB_ID` 形态不合法，GitHub 侧 404，见 I010）。
2. 字体许可证未独立复核上游 LICENSE（两次联网均失败），`/licenses` 页已明写这一句，挂 I040。
3. 三项合规位的真实值：`SITE_ICP`（备案）、`SITE_POLICE_ICP`（公安备案）、`SITE_CONTACT_EMAIL`（对外邮箱）由我本人填；未填之前页脚相应行不显示。
4. 生产编排整体实跑与 `/api/health` 探针在服务器上的表现仍未验（本轮只做了 `config` 渲染核对）。
5. I021（浏览器打印成 PDF 的真实分页）仍未验；本轮材料页数从 96 涨到 107，这条为什么必须验的理由更硬了。

## 六、按 CI 顺序在 linux 容器里复跑（首跑预演，2026-11-04）

真 Actions 这次跑不了：`git ls-remote` 报 `Recv failure: Connection was reset`，GitHub 与 Docker Hub 都不通，
且本地 `main` 领先 `origin/main` 三个提交未推送（推送是我本人的动作）。
所以改成**把 `.github/workflows/ci.yml` 的九步原样在容器里复跑**：仓库只读挂载、工作副本建在容器自己的
文件系统里（排除 `node_modules/.next/tmp/.git`），配一次性 `postgres:16` 服务，作业级 env 与工作流逐键一致。
临时编排放在 `tmp/ci-rehearsal.yml`，用完 `down -v`，本地 `laity-postgres` 未受影响。

**首跑预演抓到的两个真缺陷（都会让 GitHub 上直接红）：**

1. **`tsc` 步骤 `TS2304: Cannot find name 'PageProps' / 'LayoutProps'`（6 处）**。
   这些是 Next 生成的路由类型，落在 `.next/types/**/*.ts`，而 `tsconfig.json` 的 `include` 正指着它。
   本机跑过 `dev`/`build` 所以目录一直在，CI 的干净工作区里没有——**这道门禁在我机器上从来没真正验证过自己的前提**。
   修法：CI 在 `prisma generate` 之后、`lint`/`tsc` 之前加 `npx next typegen`（已确认该命令存在于 Next 16.4.3 的 CLI）。
2. **`tests/site.test.ts` 用例假设环境变量未设置**：它断言 `process.env.NEXTAUTH_URL === undefined`，
   而 CI 的作业级 env 恰恰设了 `NEXTAUTH_URL=http://localhost:3000`，于是 `actual: 'http://localhost:3000', expected: undefined` 直接红。
   根因不止在测试：`src/lib/site.ts` 把 `configured` 读在**模块加载期**，所以"已配置"分支与尾斜杠归一化分支此前根本无法测、也确实没测。
   修法：`siteUrl()` 改为调用时读环境变量（本模块只在服务端求值，成本可忽略），测试改为自行设定并复原 env，
   覆盖已配置/未配置/空串/纯空白/带尾斜杠五种输入。本机在**设了**和**没设**两种环境下各跑一遍，均 50/50 通过。

修完再跑第 9 步"材料与成品逐字节一致"又红了一次——**这次是它该红**：我改了 `site.ts` 却没重出材料。
重出（5358 行 / 108 页 / 收录 62）后完整复跑，退出码 0：

```
== 1. npm ci ==        通过（锁文件在 linux 上原样生效，I018 的常驻防线成立）
== 2. prisma generate ==
== 2b. next typegen == 通过
== 3. lint ==          通过
== 4. tsc ==           通过
== 5. test ==          tests 50 pass 50 fail 0
== 6. migrate deploy == 通过（那条 init 迁移能在全新的 postgres:16 上从零应用）
== 7. build ==         通过（占位 env、无 .env 文件；18 个静态页生成完成）
== 8. 材料自检 ==       通过（assertComplete + assertWindowFit）
== 9. 材料同步 ==       一致 源程序文档.html / 一致 软件操作说明书.html
ALL CI STEPS PASSED
```

第 9 步还顺带证明了一件我原本担心的事：**Windows 生成的材料与 linux 重新生成的材料逐字节相同**，
所以那道 `git diff --exit-code` 门不会因为换行符或平台差异误报。

仍未拿到答案的一条：`next build` 到底依不依赖数据库可达——复跑时库是开着的，而"停库构建"的实验被安全策略拦下，
我没有绕。CI 配了一次性真库，所以这条不确定不影响流水线成立。

## 七、两个部署阻塞项结案（I025 / I026，2026-11-04）

两条都靠一次性容器实测结案，全程不碰本地 `laity-postgres` 与现有生产标签之外的东西。

**I026 的真因是标签错配，不是"compose 构建不刷新"。** 证据链：

```
compose 默认名镜像 laity-archive-migrate:latest（43 小时前）  → 含 /usr/bin/openssl，prisma 可用
手工标签镜像     laity-archive-migrate:prod（4 天前）        → NO_OPENSSL
核对命令看的正是 :prod —— 而 compose 不写它（migrate 服务原先没写 image）
```

给 `migrate` 钉上 `image: laity-archive-migrate:prod` 后复跑：

```
构建前 :prod = 4b925be03f65
docker compose -f docker-compose.prod.yml --env-file tmp/prod-dummy.env build migrate → exit 0
构建后 :prod = d161c2e131b8，新镜像内 command -v openssl → /usr/bin/openssl
```

顺带纠正一处旧认知：不带服务名的 `docker compose build` 会**整个跳过** `profiles: ["tools"]` 的 migrate，
所以手册第二节改成 `build app` 与 `build migrate` 两条点名命令。显式点名时 profile 会自动启用（实测 exit 0 且真构建）。

**I025 的原诊断（migrator 镜像里客户端是桩）不成立，真因是镜像里没有 `src/`。** 容器内实测：

```
node -e "require('@prisma/client')" → PrismaClient= function      ← 客户端是生成过的
ls -d prisma/seed.ts                → 存在
node prisma/seed.ts                 → ERR_MODULE_NOT_FOUND: Cannot find module /app/src/lib/content-hash.ts
ls -d src                           → No such file or directory   ← deps/migrator 阶段只拷 package.json、锁文件与 prisma/
```

也就是 seed 失败与 Prisma 无关，是 `prisma/seed.ts` 第 12 行按 AGENTS.md 的哈希单源要求引了
`../src/lib/content-hash.ts`，而那个文件不在镜像里。处置按原倾向 B 结案：**生产不播种**，
seed 定位为本地 `prisma migrate dev` 的伴生动作，生产数据由后台录入——把测试种子塞进真库本就不合适。
迁移路径不受影响：同一镜像在全新 postgres:16 上 `npx prisma migrate deploy` 输出
`All migrations have been successfully applied`。

编排文件变更后已重出软著材料（5367 行 / 108 页 / 收录 62，窗口自检未拒绝出件），
`npm test` 50/50、`tsc` 0、`lint` 0。

## 八、GitHub Actions 真首跑结果（2026-11-04，run 41752295295）

推送后 GitHub 上真跑了一轮，用匿名 REST API 取回结果（`gh` 未安装，装它属新增系统依赖，未自行下手）：

```
workflow : 发版门禁（push 触发，attempt 1）
提交     : main @ d8ced9c
状态     : completed / success      耗时 2m07s
```

逐步结果（14 个业务步骤全 success，前后置步骤亦 success）：

| 步 | 名称 | 结论 |
|---|---|---|
| 5 | 安装依赖（npm ci，锁文件原样生效） | success |
| 6 | 生成 Prisma 客户端 | success |
| 7 | **生成路由类型**（`next typegen`，第六节补的那步） | success |
| 8 | 代码检查 | success |
| 9 | **类型检查**（预演时在这里报 6 处 TS2304） | success |
| 10 | 单元测试（Node 内置测试器） | success |
| 11 | **在全新库上应用迁移** | success |
| 12 | 构建 | success |
| 13 | 软著材料收录完整性自检 | success |
| 14 | 材料与说明书是否同步 | success |

三条值得记的结论：

1. 第六节的容器预演**预测准确**——真跑绿了，且预演唯一没能覆盖的两件事（GitHub runner 的 npm 版本、Actions 缓存行为）也没出问题。
2. 第 14 步这道门在真 runner 上也判定"逐字节一致"，说明 Windows 生成的材料与 linux 重新生成确实同字节，跨平台不会误报。
3. 第 11 步在全新 `postgres:16` 服务上应用迁移通过，与第七节本机容器实测的 `All migrations have been successfully applied` 相互独立地成立——两条证据来自不同环境，结论一致。

CI 至此从"写了但没跑过"变成常驻防线（I037 结案）。仍未验的只剩服务器上的整套启动（`up -d` 后探针、nginx 反代与 TLS），那需要服务器侧执行。

## 九、取消 GitHub 登录（口令化）与三条此前被登录卡住的判据（2026-11-04）

背景：我点名"先取消 github 登录"。本地 `GITHUB_ID` 一直对不上 OAuth App（派生判定：长 20 且含大写，GitHub 的 client ID 全小写），而登录进不去 → 后台的写路径一条都验不了。改法见 DESIGN D20：NextAuth v4 与 JWT 会话都不动，只把提供方换成内置的 Credentials（id `admin`），准入判定收敛到 `src/lib/admin-password.ts`。

本机 `.env` 我没有读、也没有改：这一轮 dev 服务的 `ADMIN_PASSWORD` 与 `NEXTAUTH_SECRET` 都由命令行注入**哑值**（`dev-dummy-*`），Next 的 `.env` 加载不覆盖已存在的 `process.env`，所以不需要动我的文件。

### 四道门禁（改动后重跑）

| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npm run lint` | 0 | 无告警输出 |
| `npx tsc --noEmit` | 0 | 无输出 |
| `npm test` | 0 | `tests 56 / pass 56 / fail 0`（新增 `tests/admin-password.test.ts` 5 条、`error-text` 增"GitHub 白名单时代的码已经不再出现"1 条） |
| `npm run build` | 0 | 路由表 `/login` 为 `ƒ`、`/api/auth/[...nextauth]` 为 `ƒ`，`ƒ Proxy (Middleware)` 在位 |

### 口令判定（纯逻辑，已在 `npm test` 内锁定）

未配置口令 → 任何输入都拒绝（含空串，配置缺失不等于存在万能空口令）；口令正确 → 通过；改一个字符 / 全大写 → 失败；输入为 `null`、`undefined`、空串 → 失败；只裁配置值首尾空白，不裁输入；比较走"两侧各取 SHA-256 后 `timingSafeEqual`"。

### 端到端（curl，逐条判据）

```
GET  /api/health                     → {"status":"ok","db":true}
GET  /api/auth/csrf                  → {"csrfToken":"…"}
POST /api/auth/callback/admin        → http=200  body={"url":"http://localhost:3000/admin"}
                                        cookie jar 里 next-auth.session-token 行数 = 1
GET  /admin   （带该 cookie）         → http=200，正文含"后台"，不含"管理员口令"（即真进了后台）
POST /api/auth/callback/admin        （新 jar，口令写错）
                                     → http=401  body={"url":"…/api/auth/error?error=CredentialsSignin&provider=admin"}
                                        该 jar 里会话 cookie 数 = 0
GET  /admin   （无 cookie）           → http=307 → /login?callbackUrl=%2Fadmin
GET  /login                          → http=200，正文含"管理员口令"，全文搜不到 github/GITHUB 字样
```

### 端到端（应用内浏览器，真人路径）

1. `/login` 输口令 → 落到 `/admin`，标题"后台 · Laity 项目档案库"，右上角显示身份名"管理员"与"退出"。概览计数 `PROJECTS 1 / PUBLISHED 1 / DRAFTS 0`（种子数据未被触碰）。
2. 新建临时日志 `log003-selftest-tmp`，正文写 `客户反馈 13800138000 这个号码能收到通知` → 保存成功，编辑页出现"发布前核对 · 命中 1 类形态 · **阻截** · 手机号 ×1 · `1380…8000`"（脱敏显示）。
3. **`LOG_003`（拒）**：不勾选确认直接点发布 → 回到 `…/edit?error=LOG_003`，横幅文案为"正文里有疑似敏感信息…请先核对并删改；确认无误再勾选「已核对，仍要发布」。"，页内仍是 `○ DRAFT`。
4. **`LOG_004`（拒）**：删除框里故意填 `wrong-slug-on-purpose` → 回到 `…/edit?error=LOG_004`，日志仍在。
5. **`LOG_003`（放）**：勾选确认后再发布 → `…/edit?published=1`；前台 `/logs/log003-selftest-tmp` 打开，详情页显示 `内容摘要 CONTENT HASH · 4f49af0d…` 与发布时间 `2026-11-04 03:15 UTC`（本机 11:15，UTC+8，与"存 UTC、展示层转换"一致）——摘要与时间同一次写入这条判据第一次拿到真界面证据。注：当场抓取只取了页面前 80 个字符，摘要尾部被截，**没有逐位核对那串值本身**；"64 位小写十六进制"这个形态由 `tests/content-hash.test.ts` 的 `/^[0-9a-f]{64}$/` 断言锁定，属另一条独立证据。
6. **`LOG_004`（放）**：删除框原样填 `log003-selftest-tmp` → 回到 `/admin?deleted=1`，横幅"DELETED · 该条日志已彻底删除，正文与摘要都不再保留"；随后 `fetch('/logs/log003-selftest-tmp')` 返回 **404**，概览回到 `1 / 1 / 0`。临时数据清理干净，种子日志未受影响。
7. 附加（I017 的两条分支，不需要伪造任何凭据）：带会话访问 `/login?callbackUrl=%2Fadmin%2Fprojects` → 直接落到 `/admin/projects`；口令错 → `?error=CredentialsSignin`。

### 顺带查出的两个 dev 期问题（都已结案）

- `I047`：`/login` 在 Cache Components 下被预渲染，而 `getServerSession()` 会走到 NextAuth 的 csrf 生成（无 csrf cookie 时 `randomBytes(32)`，`core/lib/csrf-token.js:25`），框架判为不稳定值 → 一轮里 `blocking-prerender-random` 报 602 次。按报错给的第一条建议在读会话前加 `await connection()`，复测该错误计数 **602 → 0**。机制与提供方无关，GitHub 时代同样存在，本轮才因"浏览器长时间停在 `/login`"暴露（此句为源码判读，未做 A/B 复跑）。
- `I048`：我起初把 dev 输出重定向到仓库内的 `tmp/dev.log`。Turbopack 监听整个项目目录，日志写入 → 触发重编译 → Fast Refresh 让浏览器整页重载 → 又写日志，实测约 **7.5 次/秒**（浏览器已切到别页仍在涨，证明是服务端自激而非页面脚本）。输出改写到仓库外之后，同一页 `GET /login` 增速由 45 行/8 秒降为 **0**。教训：`tmp/` 的规矩管的是脚本产物与快照文件，**长跑进程的标准输出不能落在被监听的目录里**。

### 仍未验（不拿上面的绿冒充）

- 真上传（`IMG_001` 的成功分支）：会往 OSS Bucket 写一个对象，而那把密钥只有 `PutObject`、删不掉，属外部副作用，须我本人点。拒绝分支（伪造 MIME / 超 5MB）由 `tests/image-signature.test.ts` 覆盖，页面入口未复测。
- 服务器上 `up -d` 后 `ADMIN_PASSWORD` 的实际生效（第八节的整套启动仍待服务器侧执行）。
- `ADMIN_PASSWORD` 不合格时 preflight 是否拦住：**本机已实跑两条分支**（哑值，容器内不落任何真实凭据）——
  `docker compose --env-file tmp/prod-dummy-shortpw.env -f docker-compose.prod.yml run --rm preflight` 退出码 1，
  末行 `上线门禁未通过：ADMIN_PASSWORD 短于 12 位（后台只认这一把口令，短了等于没设）`；
  换成 ≥12 位的哑值后退出码 0，通过行只印长度不印值（`数据库用户 laity_app、口令长度 23、后台口令长度 26、…`），
  且输出里 `FAKE_` 出现次数为 0。另核 `config` 渲染：`ADMIN_PASSWORD` 同时出现在 preflight 与 app 两处 environment，
  `GITHUB_ID` / `ALLOWED_GITHUB_IDS` 在渲染结果里已彻底消失（计数 0）。

## 十、1044 / 1045 / 1046 同日落地（2026-11-04，我点名"1044 可改，1045、1046 根据你的经验改"）

| 条 | 改了什么 | 判据与实测 |
|---|---|---|
| I044 | AGENTS.md 三处过期事实：技术栈锁定的登录行、环境实况里"真实上传联调"的前置、合规红线段的 preflight 清单最后一项；文件头 修订留痕 追加一行 | 登录行现写"内置 Credentials（id `admin`）+ `ADMIN_PASSWORD` + `token.isAdmin`"，并新增一条约束"`src/proxy.ts` 不得 import `src/auth.ts`"（口令比较用 `node:crypto`，不该进前置守卫）——这条不是风格偏好，是本轮真实踩过的耦合点 |
| I045 | ci.yml 删除 `GITHUB_ID` / `GITHUB_SECRET` / `ALLOWED_GITHUB_IDS` 三行 | **没有**替换成 `ADMIN_PASSWORD` 占位：CI 全程不调 `authorize`，`tests/admin-password.test.ts` 自带哑值，新增一个没人读的变量正是本条要治的病。改后 `npm run lint/tsc/test/build` 全 0；Actions 实跑已过：推送 `d7959bf` 后 run 41778791390 的 18 步全 success（含第 5 步 `npm ci`、第 10 步 56 条单元测试、第 13/14 步材料完整性与同步比对），本条据此收口 |
| I046 | `deploy/nginx.conf` 加登录端点限速 | 见下 |

限速的落法与验证：`limit_req_zone $binary_remote_addr zone=laity_auth:10m rate=5r/m` 必须写在 server 块之外（conf.d 被 include 进 `http{}`，放进 server 会 `[emerg]`）；新的 `location = /api/auth/callback/admin` 挂 `limit_req zone=laity_auth burst=5 nodelay` 与 `limit_req_status 429`；`proxy_set_header` 等公共参数从 `location /` 提到 server 层，两条 location 共用一份，避免"改了通用头部漏改登录那条"的漂移。

本机一次性验证（自建网络 + 占位 `app` 容器 + 哑自签证书，跑完全部拆除）：

- `nginx -t` → `syntax is ok` / `test is successful`，退出 0。
- 同一 IP 连打 12 次 `POST /api/auth/callback/admin` → `200 200 200 200 200 200 429 429 429 429 429 429`，与"1 + burst 5"完全一致；429 的页面由 nginx 自己回（`Server: nginx`，`server_tokens off` 没带版本号）。
- 同一 IP 连打 12 次 `GET /` → 全 200，证明限速只挂在登录端点，不影响正常浏览。
- 头部继承：把占位 `app` 换成回显请求头的服务，经该 location 收到 `x-forwarded-host` / `x-real-ip` / `x-forwarded-for` / `x-forwarded-proto=https` 四项齐全（Server Action 同源比对与 NextAuth 的 Secure cookie 判定都依赖它们）。
- 拆除核对：`docker ps -a --filter name=laitycheck` 与 `docker network ls --filter name=laitycheck` 均为空，`tmp/certs/` 已删；开发容器 `laity-postgres` 全程未受影响（`Up 3 hours`）。
- 入口脚本另有一条无害提示 `can not modify /etc/nginx/conf.d/default.conf (read-only file system?)`——真实部署同样是 `:ro` 挂载，属既有行为，非本次引入。

本轮材料同步：说明书加了"登录限速"一条并在 5.1 内指向它；`ci.yml` 在收录清单里，删三行后重出两份 HTML 并核窗口与幂等。

## 十一、跑起来之后按实测改的五个点（2026-11-04，我点名"运行一下程序，按经验优化页面美观与功能权限，可以暂时突破限制"）

### 先量再改：八条路由的现状（应用内浏览器 + 隐藏 iframe 按 375/1280 两种宽度测）

| 项 | 实测 | 结论 |
|---|---|---|
| 横向溢出 | 全部页面 `scrollWidth` 不超过视口，越界元素 `[]` | 响应式没问题，不动 |
| `h1` 数量 / `main` 地标 / 跳转链接 | 前台各页 `h1=1`、`main#main`、`a[href="#main"]` 齐 | 前台合格 |
| 日志正文排版 | `18px / 33.3px`（=1.85）、`Noto Serif SC` | 与视觉铁律一致，**不许"优化"掉它** |
| 标签与时间戳 | `10–11px` `JetBrains Mono`，最差对比 6.45:1 | 小但是既定设计语言，未改数值 |
| 后台各页 | `/admin`、`/admin/logs/new`、`/admin/projects` 均 `main=false`、无跳转链接 | **缺口 1**：键盘用户要 Tab 过整条导航 |
| 隐藏文件输入 | `input[type=file].className="hidden"` 无 `id`/`label`/`aria-label` | **缺口 2**：读屏下是个无名控件 |
| 七个写动作按钮 | `disabled`/`useTransition`/`useFormStatus` 全仓零命中（Editor 的上传按钮除外） | **缺口 3**：连点就是重复写 |
| 三层判定 | 守卫判 `token.isAdmin`，动作层只判"会话存在"；`/api/auth/session` 实测返回 `{"user":{"name":"管理员"},"expires":…}`，没有 `isAdmin` | **缺口 4**：同一件事两套口径 |

### 五项改动与其判据

1. **判定统一**（`requireAdminSession()` + `session` 回调带出布尔位）。改后同一端点实测：`{"user":{"name":"管理员"},"expires":"…","isAdmin":true}`。三处判定（Proxy / 后台布局 / 各 Server Action）从此共用一个入口。
2. **后台地标与跳转链接**：`admin/layout.tsx` 内容容器改为 `<main id="main">` 并加"跳到正文"，样式复用前台那条 `sr-only focus:not-sr-only …`。改后实测 `mainId="main"`、`skip=true`。
3. **文件输入可访问名**：补 `aria-label="选择要插入正文的图片"`。
4. **提交期间禁用**：新增 `SubmitButton`（`useFormStatus` 从 `react-dom` 取——先在 `node_modules/@types/react-dom/index.d.ts:82` 核实导出，没凭记忆写 `from "react"`）。七个按钮接入。实测点"新建项目"：30ms 后按钮 `{label:"提交中…", disabled:true, busy:"true"}`；重渲染后重新查询得到 `{label:"新建项目", disabled:false}`——中途那次"还是提交中"是我手里攥着**已被替换的旧节点**引用，不是状态卡死（这个区别值得记：SPA 里持有旧 DOM 引用会读出假状态）。
5. **应用层登录节流**：`admin-password.ts` 加 10 分钟 / 5 次 / 按来源的窗口。curl 实测：连错 5 次全是 401，**第 6 次换成正确口令仍 401 且不发会话 cookie**。写用例时抓到实现把额度记成负数（第 6 次失败后 `attemptsLeft` 返回 `-1`），补 `Math.max(0, …)` 后 60 条用例全绿——是测试抓到实现错，这个顺序是对的。

### 验证

`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` **60/60**（新增 4 条节流用例）、`npm run build` 0（`ƒ /login`、`ƒ /admin`、`ƒ Proxy (Middleware)` 在位）。
材料：①+② 涨 37 行把 `proxy.ts` 切出前窗口，护栏先报错，让位的是 `tsconfig.json` 与 `eslint.config.mjs` 两枚纯工具样板；终态 5626 行 / 113 页 / 收录 64，产物反推 20 个关键文件整份同窗口、连跑两次 MD5 一致、凭据扫描控制组先行且 6 处命中全是模板值与规则文本本身。
数据无损：本轮为验证新建的临时项目"UI 探针（临时）"已通过界面删除，列表回到只有"地球 Mirror"；种子日志未被触碰。

### 明确没做与待确认

- 没引入任何依赖，没动视觉铁律的具体数值，没碰 `next.config.ts` / CI / lockfile。"可以暂时突破限制"我按"允许我自己拍板"理解，没有理解成"可以拆锁定"——要拆得单独点名。
- 节流的进程内计数不跨实例、来源键取 `X-Forwarded-For` 首跳，直接暴露时可伪造（记 I050）。
- AGENTS.md 的"三处会话判定"仍写 `getServerSession`，与本轮改动不一致（记 I049，等点名）。
- **服务当前是停的**：验证节流需要连错 5 次，跑完后重启 dev 才能清掉锁；而重启命令会把哑口令写在命令行里，被凭据护栏拦下（我没换写法绕）。恢复方式二选一：你在 `.env` 里填自己的 `ADMIN_PASSWORD` 后 `npm run dev`；或你点名让我用某个值重启。

## 十二、I049 / I050 按我的经验落地（2026-11-04，我点名"I049，I050 可以改，需要根据你的经验改"）

| 条 | 落地 | 判据 |
|---|---|---|
| I049 | AGENTS.md 登录行的"三处会话判定"改为**共用 `requireAdminSession()`**，并说明布局与动作判的是 `session` 回调带出的 `isAdmin`；新增一条"登录限速有两层"；文件头 修订留痕 记这次点名 | 与代码一一对得上：`src/auth.ts` 的 `requireAdminSession()`、`session` 回调 `Object.assign(session, { isAdmin: … })`、`deploy/nginx.conf` 的 `limit_req`、`src/lib/admin-password.ts` 的窗口 |
| I050 · 真问题 | `deploy/nginx.conf` 的 `X-Forwarded-For` 从 `$proxy_add_x_forwarded_for`（追加）改为 `$remote_addr`（**覆写**） | 一次性容器实测：客户端发 `X-Forwarded-For: 1.2.3.4, 5.6.7.8`，应用实际收到 `{"xff":"172.20.0.1","realip":"172.20.0.1","proto":"https"}`——伪造的第一跳没能穿过边缘。追加写法下节流的来源键可任意伪造，这一条改完它才有意义 |
| I050 · 可诊断性 | `ADMIN_PASSWORD` 未配置时，`authorize` 往服务器日志写一条不含值的提示 | 本轮我自己就是踩在这上面：漏配只有一个笼统 401，人会先去怀疑口令抄错。提示只进日志、不进响应，公开页面仍不暴露"这里没配口令" |
| I050 · 不做的部分 | 不引入共享存储让节流跨实例；不加"管理员解锁"入口 | 单容器部署下"进程内"就等于"全局"；解锁入口等于在口令旁边再开一条门。三条边界写进 DESIGN D22 与 I050 处置列，按已接受记录 |

验证：`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` 60/60、`npm run build` 0；同一份 nginx 配置 `nginx -t` 通过；一次性容器与哑证书测完即拆（`docker ps -a --filter name=laityxff` 为空）。材料随 `src/auth.ts` 增行重出一次：5638 行 / 113 页 / 收录 64，窗口与整份可见复核通过，护栏未报错。

## 十三、继续优化：退出页、配置体检，以及第三次挤破窗口后的结构性配平（2026-11-04，我点名"根据你的经验继续处理优化"）

### 发现一：全站唯一一处英文界面是框架的退出确认页

后台右上角一直是 `<a href="/api/auth/signout">`，点下去落 `next-auth/core/pages/signout.js` 服务端渲染的确认页：`<h1>Signout</h1>` / `Are you sure you want to sign out?` / `Sign out`，装在框架默认 `.card` 样式里。I012-B 当年替换登录默认页的理由（"默认页带圆角与浅色主题，与视觉铁律不符"）对这张页同样成立，只是当时漏了。

处理：新增 `SignOutButton`（`signOut({ callbackUrl: "/", redirect: true })`，自带 CSRF 的 POST），去掉二次确认——退出没有可丢的现场（草稿在库里不在表单里），代价却是整站唯一英文页。直接敲 `/api/auth/signout` 仍能看到那张页，UI 已无入口，是否彻底禁掉记 I052（选项① `pages.signOut` 已核 v4 支持，见 `node_modules/next-auth/core/types.d.ts:65`）。

### 发现二：本机漏配只有一个笼统 401，人会把矛头指向自己

`ADMIN_PASSWORD` 没填时登录一律拒绝是对的，但排查方向全靠猜。处理：`authorize` 第一次被调用时做一次配置体检，往**服务器日志**写一条不含任何值的提示，覆盖四种情形——口令缺失 / 短于 12 位、`NEXTAUTH_SECRET` 缺失 / 短于 32 位（这四条 preflight 只在生产编排里卡）。公开页面不透露任何配置状态。

### 发现三：窗口第三次被挤破，说明该做结构配平而不是再让一个文件

`src/auth.ts` 加了体检后 `proxy.ts`（1369-1520）第三次被前窗口切开。前两轮都是"临时挑一个文件挪进折走段"，这轮改成把三类**无算法**内容一次性移出必可见段：`db.ts`（一行 Prisma 单例样板）、`routes.ts`（路径前缀常量表，判定由 `tests/site.test.ts` 对拍锁定）、`.env.example`（与已在折走段的 `.env.production.example` 同类）。合计给 ①+② 换回约 75 行余量（前窗口现在止于 `time.ts`），而不是再赌下一次会不会破。

### 验证与未验

`lint` 0、`tsc` 0、`npm test` 60/60、`npm run build` 0；材料 5723 行 / 115 页 / 收录 65、必须整份可见 30 个文件、产物反推关键文件整份同窗口、连跑两次 MD5 一致。凭据扫描先用注入的伪凭据证明扫描器有效（控制组全命中），再逐条看命中：共 7 处，5 处是规则文本自身与变量名（`password=xxx`、`isHexLike(token: string)`、`accessKeySecret: requireEnv(...)`），2 处是本轮新增的配置体检代码 `const password = (process.env.ADMIN_PASSWORD ?? "").trim()` 与 `NEXTAUTH_SECRET` 同形——**读的是环境变量，等号右侧是空串，不含任何值**。另有一条变化要说明：`.env.example` 移进折走段后，先前那行 `postgresql://root:root@localhost`（AGENTS.md 明示仅限本地的模板值）不再出现在提交页里。**真人点"退出"这一条未实测**：需要 dev 服务在跑，而重启要把哑口令写进命令行、被凭据护栏拦下（未换写法绕）——缺陷有源码为证，交互回收等服务起来后补点一次。
