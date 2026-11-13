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

## 十四、第二轮"跑起来再优化"：动效、丢稿保护、最后一张框架页（2026-11-04，我点名可暂时突破 md 文件的限制）

服务重新起起来了（这次只注入 `NEXTAUTH_URL`，不注入任何口令值）。启动后第一件事是量，不是改：八条路由横向溢出 0、`h1` 唯一、正文 18px/1.85 Noto Serif SC、最小字号 10px 对比 6.45:1、`/logs` 两个筛选维度互不丢弃、六处列表都有空状态。**"页面美观"没有可修的缺陷**——那句"可以暂时突破限制"这轮实际没用上（见 D24）。

| 改动 | 实测判据 | 未实测 |
|---|---|---|
| `globals.css`：交互元素 120ms 换色过渡 + `prefers-reduced-motion` 整体关闭 | 计算样式 `transition-property: color, background-color, border-color`、`duration: 0.12s`（按钮/输入框/链接三类都是）；同一元素 `border-radius: 0px`、`box-shadow: none` 未变；CSSOM 中查得到那条媒体查询 | — |
| `Editor.tsx`：正文偏离初始值时挂 `beforeunload`，任一表单提交先清标记 | 三段行为在真页面实测：不改内容派发 `beforeunload` → `defaultPrevented=false`；给 BEFORE 追加一个字（原生 input 事件）→ `true`；再派发一次任意表单 submit → 又回到 `false`。全程 `preventDefault` 挡掉真实提交，没写出任何草稿 | 浏览器原生对话框的外观（脚本逼不出弹窗，只能真人关标签页时看到） |
| `pages.signOut: "/login"` | `GET /api/auth/signout` → `302 location: /login`；跟随后正文只含"后台登录 / 管理员口令"，搜不到 `Signout` 与 `Are you sure` → I052 结案 | — |

顺带修一处文档陈旧：说明书 5.4 写"页面提供两个动作按钮"，实际已是四个（保存/发布/下架/彻底删除）。

运行时事实：本机 `.env` 起初**没有** `ADMIN_PASSWORD`——上一轮加的配置体检第一次在真实进程打出 `[admin] 配置体检：ADMIN_PASSWORD 未配置，登录一律拒绝（本条不含任何值）`。口令由我本人加上后重启（派生核对只报长度：口令 12、密钥 44，未复述值），再在应用内浏览器登一次，把需要会话的三条补完：

- **退出**：点右上角"退出"落到 `/`，`/api/auth/session` 变回 `{}`（会话真清了，不只是跳转），`/admin` 恢复 307、登出端点恢复 302 到 `/login`。"退出中…"这一禁用态在 120ms 采样时已看不见（跳转快过渲染），**这条视觉态仍未证**。
- **后台键盘动线**：文档序第一个可聚焦元素是 `a[href="#main"]`（"跳到正文"），目标为 `<main id="main">`，共 19 个可聚焦元素；CSSOM 里 `:focus-visible` 只有一条规则（2px 实线 + 2px 外边距），无组件自定第二套。
- **一次读数错在自己**：程序化 `focus()` 量到轮廓是 `none`，我差点记成缺陷——`:focus-visible` 本就不该响应脚本聚焦。改核 CSSOM 与键盘序之后才算证据。

门禁与材料：`lint` 0、`tsc` 0、`npm test` 60/60、`npm run build` 0；材料 5785 行 / 116 页，窗口护栏未报错、必须整份可见 30 个文件，重出后与幂等复跑一致。

## 十五、第三轮"跑起来再优化"：发布路径上的静默数据缺陷与会话寿命（2026-11-04，我点名可暂时突破 md 文件的限制、需要口令时通知我）

口令这次已经在我自己的 `.env` 里，我在应用内浏览器登一次就能走通全部写路径——助手全程没索取过口令值。量的对象换成**后台写路径的语义**，八条路由的外观上一轮已经量过、没再动。

### 发现：改了正文不点保存，直接点发布会发布旧内容

编辑页原先是两张表单：保存表单带全部字段，发布表单只带 `id`。而发布按钮旁边的说明写的是"按当前正文算 SHA-256 并记服务器时间"。两句合在一起就是错的——服务端拿的是库里那份旧正文，前台会显示"新摘要配旧内容"，不报错、不提示，肉眼看不出不对。核心功能（发布即存证）上的静默正确性缺陷，见 D25 与 I053。

改法：发布按钮挂进同一张表单（per-button `formAction`），`publishLogAction` 内部顺序改为 会话 → `parseInput` → `saveLog()` → `publishLog(saved.id)`；发布前核对面板与确认勾选框一并移进表单（它们原先在另一张表单里，勾选值根本提交不到发布动作）；按钮文案改成「保存并发布」。

| 判据 | 实测 |
|---|---|
| 所见即所发 | 草稿 BEFORE 写 `A 句：初稿正文 alpha-111` → 界面改成 `B 句：改过没保存的正文 bravo-222` → **一次保存都不点**，直接点「保存并发布」→ `?published=1`；前台 200、含 B、不含 A |
| 摘要算的是新正文 | 页面印章 `01b4456458626eb9d94ff85201dc65b532b2246d327cb6c19f2aadfb35fcdb03`；用唯一实现 `computeContentHash()` 在 Node 里独立重算：按 B 得同一串，按 A 得 `3b7ad680…`（不一致）。旧实现下前台只可能是后一种 |
| 敏感门未被绕过 | 正文含阻截形态、不勾选 → `?error=LOG_003`，后台概览仍是 DRAFT；勾选后 → `?published=1` 且前台可见 |
| 校验先于写 | 清空 TITLE 再点「保存并发布」→ `?error=VAL_001`，库里一个字段都没动 |
| 会话寿命 | `/api/auth/session` 的 `expires` 与签发时刻相差 43200 秒（12 小时，v4 默认 30 天） |

### 一处我自己没能拿证据支撑就退回的改动

同表单两按钮在请求在途期间会一起变灰**并各自换文案**（"保存中…"/"发布中…"同时出现）——`useFormStatus` 的 pending 是表单级的。本想按按钮归因，实测 `formaction` 属性里写的是 React 的守卫语句 `javascript:throw new Error('A React form was unexpectedly submitted…')`，不是动作本身；`status.action` 取的是提交按钮 props 里的函数引用，而它跨 RSC 边界是否还是同一个引用我无法证明。拿不可证的等式做交互判据，最坏结果是按钮再也不显示待命文案，于是退回共享 pending，只把这条边界记进 D25。变灰共用正是要的（不允许并发写）。

### 清理与门禁

两条临时日志（`publish-flow-selftest-tmp`、`pending-label-selftest-tmp`）均用后台「彻底删除」清掉：概览 `PROJECTS 1 / PUBLISHED 1 / DRAFTS 0`、`?deleted=1` 横幅在位、前台两条 slug 均 404。

`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` 60/60、`npm run build` 0（路由表 4 条 ◐ PPR 不变）。材料重出 5820 行 / 117 页、说明书 488 行 / 17 页、收录 65 个文件，`assertWindowFit()` 通过（必须整份可见 30 个文件），独立脚本 `tmp/whole-check.mjs` 逐页反查 19 个关键文件全部整份同窗口；连续两次生成的 MD5 相同（幂等）；凭据扫描先用四组伪凭据验证扫描器有效（四组全命中）再采信结论，产物内 7 处命中逐条读过，全是形如 `process.env.ADMIN_PASSWORD`、`accessKeySecret: requireEnv(...)`、`password=xxx` 这类**键名与规则描述**，无任何值。

仍未实测：真实上传的成功分支（要我在后台亲自查一张图）、服务器上的 `up -d` 实跑、`docs/03-功能截图`、I021 浏览器打印分页、I040 字体上游 LICENSE 复核。

## 十六、第四轮"跑起来再优化"：后台写路径的正确性收口（2026-11-04，我点名"只修正确性"）

程序本机就在跑（`GET /api/health` → `200 {"status":"ok","db":true}`），会话也还在上一轮签发的 12 小时内，所以这一轮**没有索取口令**——需要登录的写路径实测直接就能做。量的对象是后台写路径的语义；范围按我点名的"只修正确性"，外观与无障碍项一律记账。

### 六条发现与其判据（D26 / I054–I057）

| # | 缺陷 | 实测判据 |
|---|---|---|
| 1 | 被拒的保存销毁整页打字内容（动作 redirect 回编辑页 → 全字段从库里重渲染），且提交监听把 dirty 标记清掉，丢稿拦截在这条路上自我解除武装 | 11 个标签提交 → 落 `?error=VAL_001&field=tags`，BEFORE 正文 `丢稿自检正文 charlie-333…` **完整回到编辑器**、`sessionStorage` 键已清（回填一次即作废，不会下次复活） |
| 2 | `VAL_001` 一个码覆盖 9 条规则，用户不知道错在哪一格 | 横幅 `VAL_001 · 标签最多 10 个，单个不超过 24 字。`；标签框上 `aria-invalid="true"` 且 `aria-describedby="form-error"` |
| 3 | 项目保存/删除跳回裸列表页无回显；删除一击生效且按钮与"编辑"同款 | 保存临时项目 → `?saved=1` + 横幅 `SAVED · 项目已保存`；第一次点删除只把文案换成"再点一次确认删除"、隐藏位 `confirmDelete` 由 `""` 变 `"on"`、URL 不变（没提交）；第二次点 → `?deleted=1` + `DELETED · 该项目已删除`，列表里只剩真实项目 |
| 4 | `/login` 的 `Configuration` 文案念出 `NEXTAUTH_SECRET`/`NEXTAUTH_URL`，而该页对外可访问 | 无会话 fetch（`credentials: "omit"`）取回 `/login?error=Configuration` 的正文：含"登录没有配好，服务器侧缺少必需的密钥或地址，请查看服务端日志。"，正则搜 `NEXTAUTH\|SECRET\|_URL` 为 false；另有测试把这条钉在 `npm test` 里 |
| 5 | `safeCallbackUrl` 只挡 `//host`，`/\host` 能绕过（WHATWG 把反斜杠当路径分隔符） | 取回 `/login?callbackUrl=/\evil.com` 的序列化载荷：按钮实际会 POST 的回调值是 `/admin`；正常值 `/admin/projects` 原样保留 |
| 6 | 表单里的原始 id 直接拼进 redirect；`projectId` 不校验存在性；项目被先删时 `saveProject` 抛 P2025 变 500、`deleteProject` 把 P2025 报成删除成功 | 把项目下拉值改成 `bogus123` 提交 → `?error=VAL_001&field=project` + 横幅"请选择一个存在的项目…"，**没有 500**；id 一律过 `ID_PATTERN` 才拼地址 |

### 我自己引入的新缺陷，被浏览器控制台抓到

为了"让高频错误在提交前就出不去"，我把 `pattern={SLUG_PATTERN.source}` 写进了输入框。浏览器按 `v` flag 编译 `pattern`，字符类里尾随的 `-` 在那儿是非法的，控制台直接报 `Invalid character class`——这条原生约束其实根本没生效。改成单源 `SLUG_SOURCE`（`-` 转义），服务端 `SLUG_PATTERN` 由它派生，并在 `tests/forms.test.ts` 加一条"同一份 source 在浏览器 `v` flag 与正则在服务端两侧都成立"的测试。记 I055。

顺带一条读数教训：我最初用 `f.checkValidity()` 的 false 去归因"标题超长被拦"，逐个控件查下来发现真正无效的是**空着的 slug（required）**——标题的 `tooLong` 在程序化赋值下始终 false（浏览器在真实键入时直接截断到 `maxLength`，越界值压根形不成）。结论只能落在"属性在位 + 服务端具名拒绝"上，不能落在"浏览器拦住了超长输入"这句我没证的话上。

### 一处未实测（被安全策略拦下，没换写法绕）

`PRJ_003`（缺确认位则服务端拒绝删除）的**服务端分支**没跑成：临时项目已经删掉了，剩下的真实项目是"地球 Mirror"，把删除形状的请求指向它被运行时安全策略按不可逆动作拦下——判据合理，我没有重试也没有换写法。已证的是客户端"第一次点击只置位不提交"与"第二次点击在临时项目上真删成功"，服务端那一行是同一条判定的取反。

### 清理与门禁

临时数据全部回收：临时项目 `two-step-selftest-tmp` 已删；三条日志草稿（`draft-guard-selftest-tmp`、`bogus-project-selftest-tmp` 等）都在校验层就被拒，**从未写进库**。概览实测 `PROJECTS 1 / PUBLISHED 1 / DRAFTS 0`，列表里无任何 selftest 行；七条前台路由（`/ /logs /logs/prebuild-index /projects/earth-mirror /privacy /licenses /login`）全 200，详情页摘要行仍在，`/privacy` 已带上 sessionStorage 那句新承诺。

`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` **67/67**（新增逐字段文案、Configuration 不含键名、ID 形状、LIMITS 对拍、回调反斜杠、`v` flag 可编译六条）、`npm run build` 0。

材料第四次被窗口护栏拦下：`①+②` 涨到 1501 行、`src/proxy.ts`（1353–1504）被前窗口切开，`assertWindowFit()` 拒绝出件。按它给的处置把 `src/lib/image-signature.ts`（46 行，读文件头比表；调用它的上传动作本就在折走段）从 ② 平移进 ③，出件 6213 行 / 125 页 / 收录 65、说明书 518 行 / 18 页（未超 60 页上限，整份提交）、必须整份可见 29 个文件全部通过，连续两次生成 MD5 相同。我自己的反查脚本 `tmp/whole-check.mjs` 先报了"1 个文件未整份可见"——那是它的 MUST 清单没跟着这次有意分带调整更新，属清单过期而非产物出错，摘掉该条并写明理由后复跑为全绿（这正是"自研工具的输出来当真值用"要先对拍的那一类）。凭据扫描四组伪凭据控制组全命中后采信结论，产物 7 处命中逐行读过，全是 `process.env.ADMIN_PASSWORD`、`accessKeySecret: requireEnv(...)`、`password=xxx` 这类键名与规则描述，无任何值。

### 记账不动手（我点的范围是"只修正确性"；下列已在第十七节逐项落地，除注明者）

`role=alert`（8 处横幅）、`confirmSlug` 可访问名、`/login` 的 `main#main` 与跳转链接、正文 `#` 渲染成第二个 `<h1>` 且脱离字号系统、后台导航 `aria-current`/`aria-label`、`globals.css` 三处硬编码 `#e7e7e2`、`licenses` 的 `text-[13px]`、复选框 `items-baseline`、首页全量取日志再 `slice(0,3)`、零调用的 `listAdminLogs`、节流桶不回收、`/admin` 的 `notFound()` 落公共 404、四处日期口径不一、`login/page.tsx` 两次重复的 `await connection()` —— 全部写进 I058/I059，等我把范围切到外观/无障碍那一轮再逐项批。另有两条判断记录在 D26：登录失败与审计日志不做（与 `/privacy` 的"不追踪"冲突），`sensitiveConfirmed` 维持自证不改。

## 十七、真实入库与真实上传：第五轮把两份"未验证"顶成 bug（2026-11-04，我点名"重点看页面美观和功能权限""以本项目做第一个测试入库，相关数据要真实""真实上传成功分支不能上传成功"）

本地库是我自己清空的，明确不恢复。于是这轮第一件事不是优化，而是**把本项目当成第一条真实数据录进去**——用 `prisma db seed` 灌示例数据十秒就能让前台不为空，但那条日志讲的是假情景，而且会把"新建项目 → 存草稿 → 保存并发布 → 前台读印章"这条真实路径整个绕开。绕开的部分恰好埋着两个确定性故障。

### 入库判据

| 项 | 实测 |
|---|---|
| 项目 | `laity-archive` / Laity 项目档案库 / product / WIP / 仓库地址 https://github.com/laity9527/laity-archive —— 走后台表单新建，`?saved=1` + 横幅 `SAVED · 项目已保存` |
| 日志 | slug `archive-itself-as-first-entry`，正文写的就是这次入库决定本身；`?published=1`，前台 200 |
| 摘要独立复核 | 页面印章 `73020c50d142c3d7affd6211d0f6ee9dae80ec4a26875df9d6ed0b880358f15b`；在浏览器里取服务端从库里渲染出的 title / before / after 三值，按 D5 口径用 `crypto.subtle.digest('SHA-256')` 独立重算 → 逐字符相同；`PUBLISHED AT · 2026-11-04 10:59 UTC` |
| 概览 | `PROJECTS 1 / PUBLISHED 1 / DRAFTS 0` |

### 上传：一个症状，三层根因

症状是永远回 IMG_001（"图片不合格"），而这句话在 AGENTS.md 与三份自测表里以"未验证"的身份存在了很久。排除与定位的判据：

1. Node 里直接跑同一份 `sniffImage()` → 对这张 PNG 返回 `{ext:'png',mime:'image/png'}`。**类型判定不是原因**——只看文案就会一头扎进 magic bytes。
2. 三个 IMG_001 出口在页面上分不开，于是在动作里临时把形状数字经既有 `code` 字段带回页面（只带数字，不带内容与凭据，用完即删）：`blob=70 ab=70 type=image/png` → 首因是 `formData.get("file") instanceof File`，而跨 React 边界反序列化后它是 **Blob**。
3. 改判 Blob 后仍 IMG_001；服务端日志里动作耗时由 7ms 变 248ms，说明开始真走网络，回头查 `oss.ts` 的 `!/^[a-z0-9./-]+$/.test(key)`：时间戳来自 `toISOString()` 必带大写 `T`/`Z`，**断言把自己生成的每个键都判死**。
4. 写回归测试时现形第三层：白名单里本来就含 `.` 与 `/`，`logs/../etc/passwd` 完全通过——注释里的"防目录穿越"此前是假的。改为逐段判（空段 / `.` / `..` 全拒）并要求 `logs/` 前缀。

结构处置：键生成与断言从 `oss.ts` 拆到新文件 `src/lib/object-key.ts`，理由与当初拆 `image-signature.ts` 相同——留在原文件里进不了 `node --test`（会拉起 ali-oss），"生成器比断言宽松"这类矛盾就只能靠人肉撞见。

端到端结果：70 字节合法 PNG 两次上传均 `已上传 · 70 字节`，直链 `https://laity-archive.oss-cn-beijing.aliyuncs.com/logs/2026-11/20261104T112157Z-72fc4931e9ca.png` 以 `<img>` 加载成功（`naturalWidth=1`）。方法记一条：直链跨域，`fetch()` 被 CORS 挡（`Failed to fetch`），**判可达性不能用 fetch，要用 `<img>` 的 onload/onerror**。探针图片没有进任何日志正文（编辑器引用已回退、未落库）；桶里两个 70 字节对象由我手工清理或交生命周期规则（应用按设计无删除权限）——记 I062。

### 顺带现形的第二条：原生校验静默失效

填仓库地址点保存"没反应"——无跳转、无横幅、无报错。判据是 `[...f.elements].filter(e => e.willValidate && !e.checkValidity())` 指到 `repoUrl`，以及 `getAttribute('pattern')` 读回 `https?://\S+`（两个反斜杠）的形状：**JSX 字符串属性不做 JS 转义**，两个反斜杠等于要求 URL 里真有一个反斜杠。与上一轮的 `SLUG_PATTERN.source`（`v` flag 下尾随 `-` 非法，控制台报 `Invalid character class`）合成一条口径：跨运行时复用的正则一律存"源串"，服务端从它派生，两侧判定用测试钉住（I060）。同时纠正一条读数：我最初把 `checkValidity()=false` 归因给超长标题，逐控件查下来无效的是空着的 slug；而 `maxLength` 在真实键入时直接截断，`tooLong` 根本不会为真。

### "美观"这轮改的七项（零新依赖，不动视觉语言）

10 处状态横幅补 `role="alert"`（后台 9 + 登录页 1），编辑器上传提示按语义分 `alert`/`status`；`confirmSlug` 补可访问名；`/login` 的 `<main>` 补 `id="main"`；正文 `#` 由渲染出口降级成 `h2` 并补 `h4–h6` 阶内字号——用一条临时日志实测：`# 一级` 与 `## 二级` 均 24.3px Noto Serif SC、`#### 四级` 18px，**页面 `h1` 总数从 2 变 1**；`globals.css` 三处硬编码 `#e7e7e2` 改回 `var(--color-hairline)`（grep 后只剩令牌定义那一处）；`/licenses` 三处 `text-[13px]` 归 `text-sm`；勾选行 `items-baseline` → `items-center`。被否：后台导航 `aria-current`（Server Component 拿不到 pathname，为三个链接引 `headers()` 或包一层客户端组件不划算）。

活区与地标在真 DOM 里核对：编辑页 `p[role]` 读出 `alert · SAVED · 已保存`，`main` 的 id 为 `main`，确认删除输入框的 aria-label 完整带出 slug，全页 13px 元素计数 0。

### 清理与门禁

临时资源全部回收：临时项目 `two-step-selftest-tmp` 与标题降级日志 `heading-demote-selftest-tmp` 都已删除（前者两步删除、后者回填 slug 的彻底删除），其 slug 前台 404，概览回到 `1/1/0`；库里现有内容只有第一条真实数据。

`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` **71/71**（新增：对象键必过自身断言、穿越与控制字符被拒、月份补零形状、REPO URL 两侧判定一致）、`npm run build` 0。材料第五次被窗口护栏拦下——`④` 因正文标题样式涨行把 `globals.css` 头部切在后窗口外，按护栏建议把 `src/app/privacy/page.tsx`（88 行静态承诺文案）平移进折走段 ③；出件 6313 行 / 127 页 / 收录 66、说明书 527 行 / 18 页、必须整份可见 28 个文件全通过，连续两次生成 MD5 相同。`tmp/whole-check.mjs` 又一次先报假错（它的 MUST 清单没跟着这次有意分带更新），摘条后复跑全绿——自研清单是第二份真相，动完分带必须回头改它。凭据扫描四组伪凭据控制组全命中后采信，产物 7 处命中逐行读为键名、参数名与规则描述，无任何值。

### 仍未实测（照旧如实标）

`PRJ_003` 的服务端分支（把删除请求指向真实项目被安全策略按不可逆动作拦下，我没换写法绕）、HTTP 层 `AUTH_001`（I013）、服务器上的 `up -d` 实跑、nginx `limit_req` 线上计时、`:focus-visible` 视觉环、浏览器原生"离开页面?"对话框外观、`docs/03-功能截图`、I021 打印分页、I040 字体上游 LICENSE 复核。

一条口径变更（同日写进研发日志第五节）：以后凡是本地有条件跑、却因为怕副作用或怕麻烦而没跑的，不再写"未验证"，写"未跑，怀疑不可用"——今天这两条"未验证"里，至少一条实际上是"从来没成功过"。

## 十八、第六轮："功能权限"收口（2026-11-05，决策与背景见 DESIGN D28）

开场就有一件事要如实说：**会话已过期**（上一轮 10:51 左右登的，12 小时有效期），助手按规矩通知我登录而不是要口令值，先把不依赖会话的九项记账里"改得起且有判据"的落地。本轮改五处，判据如下：

1. **节流桶回收（I063）**：`admin-password.ts` 记账前清窗口走光的桶，再加 512 硬上限按最旧淘汰。测试两条：过期桶被清（用 `loginBucketCount()` 基线排除既有桶干扰）、伪造 600 键后计数 ≤512。**防线自己变内存无界增长点、且触发条件正是它要防的场景**（直连暴露时攻击者可每次换 XFF 值），这是本轮最值得改的一条。
2. **错误码不回显任意串（I064）**：两处后台横幅接 `errorCodeChip()`——`/admin/projects?error=BOGUS` 应显示"未收录的错误码"。`errorTextOf()` 未知码回落不动（既有测试钉着）。
3. **后台"记录不存在"留在后台里（I065）**：编辑页对库里没有的 id 不再 `notFound()`（公共 404 只有 /logs、/projects 两个出口，回不了后台），改在后台外壳内渲染 `LOG_002` 面板，回显的 id 先过 `ID_PATTERN`。
4. **首页不全表捞**：`getSafeLogs` 加可选 `take`，首页改数据库 `take: 3`；**`/logs` 已改游标分页（50 条/页），筛选走 `getLogFacets` + `getLogList` 两次轻量查询**（2026-11-13 O1/O2 页面接入，不再全量取全文）；搜索同步改为**限量 50 条候选池**（`searchLogsLimited`），四字段子串语义保真（tags 走参数化原生 SQL）；**分页后搜索只在当前候选池内生效**，不是全库扫描；**本轮只支持向后翻页（下一页），上一页下轮补**。
5. **卫生**：`/login` 重复的第二处 `await connection()` 删掉（I059），dev 日志 `blocking-prerender-random` 删前删后均 0；后台导航 `<nav>` 补 `aria-label="后台导航"`。

`npm run lint` 0、`npx tsc --noEmit` 0、`npm test` **73/73**、`npm run build` 0。窗口护栏**第六次**拦下出件（`src/proxy.ts` 被 1500 行前窗口切开），按处置把 `markdown.tsx` 平移进折走段；出件 6392 行 / 128 页 / 收录 66，两次生成 MD5 相同，`whole-check` 的 MUST 清单第三次同步，凭据扫描产物 7 处命中仍全是键名与规则描述。

**补跑记录（同日登录后完成，应用内浏览器 + 顶层导航）**：① `/admin/projects?error=BOGUS` 横幅读出 `未收录的错误码 · BOGUS`（chip 中性、errorText 按既有口径回落原串）；② `/admin/logs/<bogus>/edit` 与 `/admin/logs/logbogusid9z/edit` 两种形状都落在后台外壳内（`main#main` 在、标题"编辑日志"、`LOG_002` 面板、合法形状时 id 原样回显、出口含概览与新建）；③ `nav[aria-label="后台导航"]` 真 DOM 可读，三个链接与 `#main` 跳转齐全；④ `PRJ_003` 服务端分支：先自建临时项目 `prj003-selftest-tmp`，对其删除表单直接 `requestSubmit()`（不经按钮 click，armed 保持 false），服务端回 `?error=PRJ_003` 且项目未被删——随后真实两步点击删掉，`?deleted=1`、列表无残留；⑤ 首页顶层导航后正文读出唯一一条真实日志 `archive-itself-as-first-entry`（库里恰好只有这一条已发布），`take: 3` 链路正常。环境限制照旧：应用内浏览器无视口，宽度类判据本机量不出。

## 十九、第七轮：上线合规面（2026-11-05，决策与背景见 DESIGN D29）

这轮按"每轮换一个量测面"换了上线合规面：HTTP 安全头、SEO 完整性、元数据、依赖健康、生产编排。我给的新授权是"可以增加依赖、文档材料可改、可以使用上线"。

**先记两处"量了但不是缺陷"**：sitemap/robots 在 dev 落 `localhost:3000` 是有意的——`siteUrl()` 复用 `NEXTAUTH_URL`，生产 preflight 硬卡它必须 https 正式域名，线上必然是真域名；manifest 不做，本站不是 PWA。

本轮落地两项，都在 `next.config.ts`（红线文件，授权来自本轮"可暂时突破"）：

1. **CSP（I066）**：先读官方指南（版本红线要求的动作），nonce 方案与 `cacheComponents` 的 PPR **不兼容**（文档原话 "Partial Prerendering is incompatible with nonce-based CSP"），不能为 CSP 推翻既成架构，取官方"Without Nonces"路径发静态头。诚实记录边界：script/style 仍需 `'unsafe-inline'`，这一档挡不住注入的内联脚本，挡住的是外联脚本、object/embed、被嵌套、表单外提与协议降级；`img-src` 放行 `https:` 是因为正文图片走 OSS 直链、域名随桶走。dev 加 `'unsafe-eval'` 且不含 `upgrade-insecure-requests`（http 直连会自断）。
2. **指纹（I067）**：`poweredByHeader: false`，`X-Powered-By: Next.js` 不再透出。

**实测判据（真实执行）**：`curl -I` 读到完整 CSP 头、`X-Powered-By` 消失；浏览器全程（首页/后台/建草稿/两步删除）控制台 **0 条 CSP violation**，HMR websocket 正常；空表单 `requestSubmit` 被原生约束拦下（`:invalid` 落 title/slug）；临时草稿 `csp-selftest-tmp` 在 CSP 下创建（`?saved=1`）与删除（LOG_004 拒空确认分支顺带验到，回填 slug 后 `?deleted=1`）全部照常，删除后前台 404；未登录访问 `/admin` 仍 307。控制台仅两条无害警告（导航后旧表单节点断连，程序化提交所致，非 CSP）。

**上线面**：镜像 `laity-archive:round7` 构建冒烟 exit 0（1.95GB，standalone 含新配置）；生产编排与 preflight 无需改动；真正的 `up -d` 在服务器上、仍由我本人执行。

**依赖健康（I068）**：`npm outdated` 实跑——全部落后 major（Prisma 6→7、TS 5.9→7、Next 16.4.3→16.4.5 patch）。技术栈锁定原则下不升级；`npm audit` 本机从未跑成（npmmirror security 端点未实现），一次性 `--registry=https://registry.npmjs.org` 审计记 I068 OPEN 等我批。
