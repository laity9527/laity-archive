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
