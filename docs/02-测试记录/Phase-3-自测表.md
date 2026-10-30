# Phase 3 自测表：后台鉴权 + 项目管理

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 3 验收标准
说明：粘贴真实执行输出。GitHub OAuth App 已由我本人创建、三个凭据已填入本地 `.env`（不出现于本文件）；真实账号授权需我本人在浏览器里登录 GitHub，AI 侧的浏览器没有 GitHub 会话，这一条如实记为"未验证"，不拿守卫逻辑的等价验证冒充 OAuth 通过。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | 未登录访问 /admin → 跳转 GitHub 授权页 | `curl -w "%{http_code} %{redirect_url}"` 访问 /admin；再按 NextAuth 的表单流程 POST 到 signin | 最终到达 github.com 授权页 | `/admin` → `307 http://localhost:3000/api/auth/signin/github?callbackUrl=%2Fadmin`；该地址 GET 返回 200 的 NextAuth 登录页（表单一枚，按钮 `Sign in with GitHub`，action 为 POST `/api/auth/signin/github`）；带 csrfToken 提交后返回 `{"url":"https://github.com/login/oauth/authorize?client_id=0v23113f7OFGWlpK95KK&scope=read%3Auser%20user%3Aemail&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgithub&callbackUrl=%2Fadmin&state=…"}`，client_id 与回调地址均正确；直接用 curl 打开该授权地址 → GitHub 返回 `302 https://github.com/login?client_id=…&return_to=…`（未登录先要求登录） | PASS（附注）——链路是"307 → 本项目登录页 → 点一次按钮 → GitHub 授权页"，比"直接跳 GitHub"多一次点击，原因见第三节 |
| 2 | 白名单账号授权 → 进入 /admin | 用真实 GitHub 账号登录并授权 | 回到 /admin 并渲染后台 | **未执行**：应用内浏览器打开授权地址后停在 GitHub 的 `Sign in to GitHub` 登录页（无会话），我不代填账号密码。守卫放行的等价验证见第二节 | 未验证（待我本人浏览器完成一次授权） |
| 3 | 非白名单账号授权 → 拒绝 | 同一枚会话分别对空白名单、伪造 token 复测 | 回到登录入口 | 空白名单 + 合法签名会话 → `307 …?callbackUrl=%2Fadmin`；伪造 token → `307`；两种情况都未进入后台 | PASS（等价验证） |
| 4 | 新建/编辑项目即时可见；slug 重复 → PRJ_002 | 浏览器填表提交两次 / 编辑后提交 | 列表刷新可见；重复 slug 出现 PRJ_002 | 新建 `zz-test-tmp / 验证项目临时` 后列表新增一行 `PRODUCT · WIP · 0 LOGS`；再提交同 slug → URL `?error=PRJ_002`，页面 `PRJ_002 · slug 已被占用，换一个。`，列表仍为 2 行（未落脏数据）；编辑改名 `验证项目临时改`、状态改 LIVE 后 → 列表显示 `● 验证项目临时改 … PRODUCT · LIVE` | PASS |
| 5 | 删除挂日志项目被拒（PRJ_001），删空项目成功 | 对 seed 项目点删除；对临时项目点删除 | 前者提示 PRJ_001 且仍在；后者消失 | seed 项目：URL `?error=PRJ_001`，`PRJ_001 · 该项目下还有日志，禁止删除。`，`earth-mirror` 仍存在；临时项目：删除后 `testGone: true`，`seededKept: true` | PASS |
| 6 | lint 零 error、build 通过 | `npm run lint` / `npm run build` | 无输出；退出码 0 | lint：第一次报 1 条 `@next/next/no-html-link-for-pages`（退出链接 `<a href="/api/auth/signout">`），按第三节处理后就地禁用该行；复跑无任何输出。build：`✓ Compiled successfully in 1785ms`，`Finished TypeScript in 1956ms`，`✓ Generating static pages (8/8)` | PASS |

build 实际输出的路由表（结尾）：

```
Route (app)
┌ ◐ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /admin/projects
├ ƒ /api/auth/[...nextauth]
├ ◐ /logs
└   /logs/[slug]
  └ ◐ /logs/[slug]

ƒ Proxy (Middleware)
```

补充断言（不在 6 条验收内，但属本 Phase 必须成立的边界）：

| 检查 | 实测 |
|---|---|
| 表单校验 VAL_001 | slug 填 `A_B` 提交 → `?error=VAL_001`，`VAL_001 · 参数不合法：slug 只能用小写字母、数字与连字符（2–64 位），名称必填。` |
| 概览计数 | 临时项目删除后访问 /admin：`PROJECTS 1 / PUBLISHED 1 / DRAFTS 0`，RECENT ACTIVITY 为 `● 决定放弃本地搜索，改用索引预构建 · 地球 Mirror · PUBLISHED · 2026-10-30` |
| 前台回归 | `/` `200`、`/logs` `200`、`/logs/prebuild-index` `200`、`/logs/not-a-real-slug` `404` |

## 二、守卫等价验证怎么做、能证明什么

真实 GitHub 账号授权需要我本人登录，AI 侧浏览器没有 GitHub 会话，但"守卫逻辑对不对"不该跟着一起悬空，所以用本地签名会话把边界打穿：

1. 用 `.env` 里本地的 `NEXTAUTH_SECRET` 调 `next-auth/jwt` 的 `encode()` 签一枚 `{ githubId: "1", name: "验证用会话" }` 的 JWT，有效期 10 分钟；
2. 浏览器打开前台页后写入 cookie `next-auth.session-token=<token>`（非 httpOnly，仅本次测试），再访问后台；
3. 分别把 `ALLOWED_GITHUB_IDS` 置空、置 `"1"`，重启服务复测；
4. 测完清 cookie、停服务、把 `ALLOWED_GITHUB_IDS` 还原成我的真实 ID、删掉 /tmp 下的 token 文件。

能证明的：Proxy 的 `getToken` → `isAllowedGithubId` → 放行/重定向这条链路在真会话与假会话下的行为一致；空白名单等于全员拒绝；伪造 token 不引发 500。
不能证明的：GitHub 侧的授权、`signIn` 回调里 `account.providerAccountId` 的真实取值、NextAuth 写 cookie 的实际属性——这三项要等我本人浏览器完整走一次授权。

## 三、登录入口为什么多一次点击，以及默认页的视觉问题

第一版命令 `/admin` 直接 307 到 `/api/auth/signin/github`，以为到了 GitHub。实测是 200：翻 `node_modules/next-auth/core/index.js` 看到 `case "signin"` 的 OAuth 分支只在 `method === "POST" && options.csrfTokenVerified && options.provider` 时才返回授权跳转；GET 走的是 `render.signin()`。也就是说 NextAuth v4 把发起 OAuth 做成了一次带 CSRF token 的表单 POST，GET 只能拿到登录页——这是它的防伪设计，不是配置错误。

结果是 `/admin` → 本项目登录页（一个 `Sign in with GitHub` 按钮）→ 点击 → github.com 授权页。多这一次点击怎么处理，两个选项摆在这里，等你定：
- **A（现状）**：保留 NextAuth 默认登录页。代价是多一次点击；且该页用的是 NextAuth 自带主题（浅色、圆角按钮），与本项目"零圆角、无阴影"的视觉铁律不一致。
- **B**：在 `authOptions.pages.signIn` 指向自建页面（如 `/admin/login`），用同款纸白表单调 `signIn("github")`。代价是要新增 `src/app/admin/login/page.tsx`——不在 Phase 3 文件清单内，属清单外改动，需你批准后才做。

## 四、lint 报错的处理（不是绕过）

第一次 `npm run lint` 报：

```
D:\ZHANGLEI\laity-archive\src\app\admin\layout.tsx
  59:11  error  Do not use an `<a>` element to navigate to `/api/auth/signout/`. Use `<Link />` from `next/link` instead.
```

不能换 `Link`：`/api/auth/signout` 是 NextAuth v4 的 Route Handler 返回的确认页，客户端导航会去要 RSC payload，拿不到。也不适合改成 POST 表单：v4 的 signout POST 必须带 `csrfToken`，服务端布局里没有现成取值入口。因此保留 `<a>`，就地在上一行加 `eslint-disable-next-line @next/next/no-html-link-for-pages` 并写明理由；全仓库只有这一处 `eslint-disable`，已 grep 确认。

## 五、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 视觉铁律 | `grep -rnE "rounded-(?!none)\|shadow-(?!none)\|bg-gradient" src/` | 零命中 |
| 图标库 | `grep -rnE "from \"(lucide\|@heroicons\|react-icons\|@radix-ui\|@tabler)" src/` | 零命中 |
| 前台/管理页直查 Log | `grep -rn "db\.log\|new PrismaClient" src/app src/auth.ts` | 零命中（项目查询全在 `src/lib/projects.ts`，日志封装仍在 `src/lib/logs.ts`） |
| XSS | `grep -rn dangerouslySetInnerHTML src/` | 零命中 |
| 密钥入库 | `git check-ignore -v .env` / `git status --short` | `.env` 被 `.gitignore:69` 忽略；`GITHUB_SECRET` / `NEXTAUTH_SECRET` 仅写本地 `.env`，`.env.example` 只有空值占位与说明 |
| 新增依赖 | `package.json` diff | 仅 `next-auth@4.24.15`（ISC），连带 15 个包全部 MIT/ISC，无 GPL/AGPL；已按停点报批流程获准 |
| schema 变更 | `git status` | 本 Phase 未改 `prisma/schema.prisma`，无新迁移（D8 的 JWT 会话即为此） |

## 六、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts/.tsx 均有文件头注释 | PASS：auth.ts、lib/projects.ts、admin/layout.tsx、admin/page.tsx、admin/projects/page.tsx、admin/project-actions.ts、api/auth/[...nextauth]/route.ts、proxy.ts |
| 修改文件追加修改记录 | proxy.ts 追加"matcher 扩展 /admin/:path*…（Phase 3）" |
| docs/01 研发日志 | 已追加第十、十一节 |
| docs/03 带地址栏截图 | 待补：需真实登录后截 /admin 与 /admin/projects（登录态截图由我本人在浏览器完成） |
| 独立 commit | 未提交：等你确认后提交（提交不含 push） |

## 七、收尾与数据恢复

| 项 | 实测 |
|---|---|
| 测试数据 | 临时项目已删除；库内仅 `earth-mirror`（1 条日志）与 `prebuild-index`（isPublished=true） |
| 测试会话 | 等价验证用的 cookie 已清除，/tmp 下 token 文件已删 |
| 环境变量 | `ALLOWED_GITHUB_IDS` 已还原为我的真实 ID `111046902`；三个 GitHub 凭据与 `NEXTAUTH_SECRET` 只存在于被 git 忽略的 `.env` |
| 服务 | 3000 端口上的 `next start` 为便于我本人登录验证保持运行（自测时 PID 48792 那轮已停） |

## 八、结论

- 判定：**条件性 PASS**——项目增改删、两条业务错误码、表单校验、概览计数、构建/类型/lint、红线与前台回归全部通过；第 1 条已验证到 GitHub 授权地址（client_id 与回调地址正确、GitHub 可达），第 2 条等我本人完整登录一次后回填。
- 待我本人执行：浏览器打开 http://localhost:3000/admin → 点 `Sign in with GitHub` → 用 GitHub 账号 laity9527 授权 → 应回到 /admin；然后截 /admin 与 /admin/projects 两张带地址栏截图。
- 待你决定：第三节的 A/B——是否要自建登录页以消除"多一次点击 + 默认页视觉不合铁律"。
- 范围外发现：I009（NextAuth v4 与 Next 16 的组合需单独评估升级）、I010（真实账号授权未验证）、I011（退出入口的 lint 规则禁用）、I012（NextAuth 默认登录页视觉与点击次数）。
