# Phase 4 自测表：日志编辑与发布存证闭环

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 4 验收标准
说明：粘贴真实执行输出。会话部分沿用 Phase 3 的等价验证手法（本地签名 JWT + 真实白名单 ID），真实 GitHub 登录仍由我本人完成；测完的探针数据已删除。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | 新建草稿（含 BEFORE/AFTER）保存成功，前台三页不可见 | 后台表单填 `phase4-probe`，BEFORE 含 Markdown 与 `<script>`，AFTER 含 `<img onerror>`，提交 | 跳编辑页；`/`、`/logs` 均不出现；直访详情 404 | 提交后跳转 `/admin/logs/cmvuovmem0001v6h8rhukswty/edit?saved=1`，页头 `○ DRAFT`、`SAVED · 已保存，当前为草稿`；`curl /logs` 与 `/` 的 `grep -c 'Phase 4 探针'` 均为 `0`；`curl -w %{http_code} /logs/phase4-probe` → `404` | PASS |
| 2 | 点发布后前台可见，详情页印章显示哈希与时间 | 编辑页点「发布」 | 状态变 PUBLISHED；前台列表出现；详情页有印章 | 跳转 `?published=1`，页头 `● PUBLISHED`、`PUBLISHED · 已发布，前台可见`，显示 `LAST PUBLISHED · 2026-10-30 08:07 UTC` 与 `CONTENT HASH · 6fa39af81fffa55f38101ce59bf61597488476a4c1cbcadc5b100ac8d2f7b97b`；`/logs` 出现 1 次标题；`/logs/phase4-probe` → `200`，HTML 内印章为 `CONTENT HASH · 6fa39af8…b97b`、`PUBLISHED AT · 2026-10-30 08:07 UTC` | PASS |
| 3 | 哈希复核：按 D5 口径现算 SHA-256，与 contentHash 完全一致 | `node` 从库里取 title/beforeContent/afterContent 现算 | 两侧完全一致 | 首次发布：`storedHash` 与 `recomputed` 均为 `6fa39af81fffa55f38101ce59bf61597488476a4c1cbcadc5b100ac8d2f7b97b`，`match: true`；改标题后重新发布：两侧均为 `b4f50884261e85f36fd2a2a39887aa43f745ce5de73c07a1a86826f049e56e42`，`match: true`、`hashChanged: true` | PASS |
| 4 | publishedAt 为服务器 UTC 时间 | 对比库中值与本地时间 | 差值为时区偏移 | 首次发布 `publishedAt: 2026-10-30T08:07:41.030Z`，本地（UTC+8）界面显示 16:07；重新发布 `08:09:32.518Z`；页面上 `PUBLISHED AT · 2026-10-30 08:07 UTC` | PASS |
| 5 | slug 重复 → LOG_001；未登录直调 Server Action → AUTH_001 | 新建页用已存在的 `phase4-probe` 提交；另尝试未登录直调 | 前者 LOG_001；后者不落数据 | 重复 slug → `?error=LOG_001`，页面 `LOG_001 · slug 已被占用，换一个。`；未登录访问 `/admin/logs/new` → `307 …/api/auth/signin/github?callbackUrl=%2Fadmin%2Flogs%2Fnew`（浏览器跟随后停在 Sign In 页）。**未登录直调 action 的 HTTP 探针被运行时安全策略拦下，未执行**，详见第四节 | 部分 PASS |
| 6 | `npm run lint` / `npm run build` 通过 | — | 无 error；退出码 0 | lint 无任何输出；build `✓ Compiled successfully in 1742ms`、`Finished TypeScript in 2.0s`、`✓ Generating static pages (10/10)`，路由表新增 `/admin/logs/new`、`/admin/logs/[id]/edit` | PASS |

build 路由表（新增部分）：

```
├ ƒ /admin/logs/[id]/edit
├ ƒ /admin/logs/new
```

## 二、发布存证与草稿隔离的补充验证

| 检查 | 实测 |
|---|---|
| 编辑已发布日志 → 退回草稿（D9） | 改标题保存后：页头变 `○ DRAFT`、提示 `SAVED · 已保存，当前为草稿`，仍显示上次发布的 `2026-10-30 08:07 UTC` 与旧哈希，并注明"这份哈希对应上一次发布的正文"；`/logs/phase4-probe` 立刻变 `404`，`/logs` 中标题计数归 `0` |
| 重新发布重算哈希 | 标题改动后重新发布，哈希由 `6fa39af8…` 变为 `b4f50884…`，`publishedAt` 由 `08:07:41` 变为 `08:09:32`，现算复核一致 |
| 运行期清洗（详情页） | 同一篇正文含 `<script>alert(1)</script>` 与 `<img onerror>`：抓取渲染后 HTML，`<script>alert` 命中 `0`、`onerror` 命中 `0`、`<strong>` 保留 `2` 处 |
| 编辑器实时预览 | 输入含 `<script>` 的正文后，预览区 `.log-body` 内 `script` 元素数 `0`，`EMPTY` 占位在空内容时正常显示；切到 AFTER 标签后预览随之切换，`<img>` 被剥离（`imgs: 0`） |
| 表单校验 VAL_001 | AFTER 时间早于 BEFORE → `?error=VAL_001`，提示文案列出四条约束 |
| 时区落库 | 表单按本地时间录入，库中 `publishedAt` 为 `…Z`（UTC），界面显示 UTC 并标注 |

## 三、红线检查

| 检查项 | 方式 | 结果 |
|---|---|---|
| 视觉铁律 | `grep -rnE "rounded-(?!none)\|shadow-(?!none)\|bg-gradient" src/` | 零命中 |
| 图标库 | `grep -rnE "from \"(lucide\|@heroicons\|react-icons\|@radix-ui\|@tabler)" src/` | 零命中 |
| 页面直查 Log | `grep -rn "db\.log\|new PrismaClient" src/app` | 零命中（管理侧读在 `src/lib/logs.ts`，写在 `src/lib/publish.ts`） |
| XSS | `grep -rn dangerouslySetInnerHTML src/` | 零命中；编辑器预览与详情页共用 `src/lib/markdown.tsx` 单一出口 |
| 新增依赖 | `git status` / `package.json` | 本 Phase 未新增依赖 |
| schema / 迁移 | `git status` | 未改 `prisma/schema.prisma`，无新迁移 |

## 四、未验证项与原因

| 项 | 原因 | 后续动作 |
|---|---|---|
| 未登录直调 Server Action 返回 AUTH_001 | 两道拦：Proxy 的 matcher 覆盖 `/admin/:path*`，未登录请求在到达 action 前已被 307；绕过 Proxy 直接构造 action POST 的探针被运行时安全策略判定为越权测试并拦下，我没有绕过策略 | `log-actions.ts` 里每个 action 开头的 `getServerSession` 仍是第二道防线（与 Phase 3 的 `project-actions.ts` 同构）；如日后收窄 matcher，必须补这条验证。已记 ISSUES I013 |
| 真实 GitHub 登录后的后台操作 | 同上 Phase 3：真实账号授权待我本人完成 | 登录后用同一套操作复验一次即可，代码路径不变 |

## 五、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts/.tsx 均有文件头注释 | PASS：lib/publish.ts、components/Editor.tsx、admin/log-actions.ts、admin/logs/new/page.tsx、admin/logs/[id]/edit/page.tsx |
| 修改文件追加修改记录 | `src/lib/logs.ts`（追加管理侧查询）、`src/app/admin/page.tsx`（加编辑/新建入口，注明经批准改清单外文件）、`DESIGN.md`（D9 与 Phase 4 文件清单） |
| docs/01 研发日志 | 已追加第十二节 |
| docs/03 带地址栏截图 | 待补：需真实登录后截新建/编辑/发布三屏 |
| 独立 commit | 未提交：等你确认 |

## 六、收尾与数据恢复

| 项 | 实测 |
|---|---|
| 探针数据 | `phase4-probe` 已从库中删除；再次查询只剩 `prebuild-index`（isPublished=true，哈希 `a0197426…`） |
| 测试会话 | cookie 已清除，/tmp 下的 JWT 文件已删除 |
| 环境变量 | 未改动；白名单仍是真实 ID `111046902` |
| 服务 | 3000 端口已停，无遗留 `next start` |

## 七、结论

- 判定：**条件性 PASS**——草稿隔离、发布存证（哈希+时间）、D9 退回草稿、重算一致性、清洗、时区、表单校验、构建与红线全部通过；第 5 条的 AUTH_001 分支只做到"Proxy 层拦截"这一层的验证。
- 待我本人：真实登录后走一遍"新建 → 发布 → 前台看印章"，并补三张截图。
- 范围外发现：I013（未登录直调 action 的探针被策略拦、AUTH_001 分支未在 HTTP 层验证）。
