# Step 5 GitHub 自动同步方案

状态：**待批准**（2026-11-10 出方案，未动任何代码）
作者：张磊（AI 代笔，事实均经源码核实）
前置：4-A/4-B/认领修复已闭环并推送（e6f703e / 6e03e02 / 855cb0c），生产部署由本人完成。

## 已核实的现状事实（方案的约束基座）

1. **token 来源**：next-auth v4 的 jwt 回调在首次登录时收到 `account`，其中 `...tokens` 展开带 `access_token`（node_modules/next-auth/core/lib/oauth/callback.js:146-150）。当前 jwt 回调只取 userId，token 被丢弃——Step 5 在同一回调里截获即可，不需要第二次授权流程。
2. **既有会话拿不到 token**：jwt 回调的 `user && account` 分支只在登录时执行。已登录用户（含生产上的 zhanglei）必须**退出重登一次**才能补上 token。这是预期行为，UI 要给出"未绑定 token 请先重新登录"的提示而不是报错。
3. **当前 OAuth scope**：`read:user user:email`（provider 默认）。读**公开**仓库的 commits 够用；读私有仓库与完整 /user/repos 列表需要加 `repo` 或 `public_repo` scope——加 scope 后所有存量 token 不含新权限，全员需重登。**决策点 D-1**。
4. **后台没有日志列表页**：/admin 只有概览（最近五条）、/admin/logs/new、/admin/logs/[id]/edit。同步按钮建议落在 **/admin 概览页**"最近动态"区头，与"新建日志"入口并列。**决策点 D-2**。
5. **表单与写路径约束**：title ≤120 字（LIMITS.title）；slug 须匹配 SLUG_PATTERN（小写字母数字连字符，2-64 位）；beforeContent 非空；tags ≤10 个、每个 ≤24 字；beforeDate 必填、afterDate 可空但不早于 beforeDate。草稿生成必须满足这些规则，否则过不了 saveLog 的既有校验。
6. **存证口径不动**：同步只产草稿（isPublished=false、contentHash/publishedAt 为空），发布仍走 publishLog 的"先存再发 + 敏感扫描"，D5 哈希口径一个字不改。
7. **隐私页冲突（配套闸门）**：/privacy 现在写"访问令牌不写入会话、也不落库"。Step 5 落库（加密）后必须改写该段与说明书 4.6/5.1/七章，否则材料自相矛盾。
8. **材料窗口**：新增 lib 文件会吃软著窗口容量，assertWindowFit 拒件时停下报负责人，不自行平移。

## Part 1: 数据模型与存储

### Schema 变更（只加字段，不动既有列）

```prisma
model User {
  // …既有字段不动…
  githubAccessToken String? // AES-256-GCM 密文（base64），可空：未重登的存量行为 null
}
```

- 迁移：`npx prisma migrate dev --name add_github_access_token`（按惯例由本人在本地终端执行，AI 不跑有 TTY 交互的命令）。
- 不建独立 Token 表：一对一关系、无轮换历史需求，单字段最简。
- 同步去重需要知道"哪些 commit 已入库"：Log 加 `sourceCommitSha String?`（合并草稿存当天首条 sha），配 `@@unique([userId, sourceCommitSha])`（可空列的唯一索引在 Postgres 下允许多个 null，不影响手写日志）。**决策点 D-3**：替代方案是 User.lastSyncedAt 游标，但重跑/补拉会重复或漏，sha 唯一键是幂等的。

### 加密工具

- 位置：**`src/lib/token-crypto.ts`**（单一来源，与 content-hash.ts 同级的"口径唯一实现"地位）。
- 算法：AES-256-**GCM**（带认证标签，防篡改；不用 CBC）。`node:crypto` 自带，**零新增依赖**。
- 接口：`encryptToken(plain: string): string` / `decryptToken(cipher: string): string`。
  密文格式 `base64(iv).base64(tag).base64(ciphertext)` 三段拼接，IV 每次随机 12 字节。
- 密钥：`ENCRYPTION_KEY` 环境变量，64 位 hex（32 字节）。缺失或长度不对**抛错即失败**，不回退、不用默认值。
- 不泄露的四道防线：
  1. 只存环境变量（.env / .env.production 本人维护），仓库只进 `.env*.example` 模板（生成命令写在模板注释里：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`）；
  2. `docker-compose.prod.yml` 的 app.environment 显式透传 `${ENCRYPTION_KEY:?}`（I024 教训：--env-file 只插值不注入），preflight 加"64 位 hex"校验；
  3. 工具函数不打日志、不回显明文/密钥；解密失败抛通用错误，不把密钥形态写进消息；
  4. 纯逻辑测试只验" encrypt→decrypt 往返一致、 tamper 后抛错"，测试密钥用注入的哑值。
- 密钥轮换：换 ENCRYPTION_KEY 后旧密文解不开 → 按"未绑定"处理提示重登，不做迁移重加密（单人项目不值得）。

### token 截获点

jwt 回调认领/建号成功后：`account.access_token` 存在则 `encryptToken` 后写入该 User 行（与认领同一次 update/create）。access_token 不进 JWT、不进 session 对象——会话里仍只有 userId。

## Part 2: 同步触发机制

- **本轮只做"用户主动点击"**，Cron 轮询不做（单人部署没有常驻调度器，引入 node-cron 属新依赖需另批；按钮已覆盖核心场景）。
- 落点：/admin 概览页"最近动态"区头加 **[ 从 GitHub 同步 ]** 按钮（D-2 待批）。表单 POST 到 `syncGithubAction`，SubmitButton 防连点（同步可能数秒）。
- 动作流程（`src/app/admin/sync-actions.ts` + `src/lib/github-sync.ts`）：
  1. `requireAdminSession()` → 无会话 AUTH_001；
  2. 读 User.githubAccessToken，null → 回跳 `?error=SYNC_001`（"请先退出并重新登录以绑定 GitHub 授权"）；解密失败同判；
  3. `GET /user/repos?affiliation=owner&sort=pushed&per_page=30`（只取本人拥有、最近有推送的前 30 个，控请求量级）；
  4. 逐仓库 `GET /repos/{owner}/{repo}/commits?author=<handle>&per_page=50`（只要本人提交；不追分页，50 条/仓库足够"最近"语义）；
  5. 过滤 → 合并 → 生成草稿（Part 3）→ 结果回跳 `?synced=N&skipped=M`。
- 限速与失败：GitHub API 认证后 5000 次/小时，30 仓库 × 1 请求远低于上限；单仓库失败跳过并计数，不整批失败；401（token 被撤销）→ SYNC_002 提示重登。
- 新错误码进 error-text.ts：SYNC_001（未绑定/解密失败）、SYNC_002（GitHub 拒绝授权）、SYNC_003（GitHub 不可达）。**注意 I078 已挂账 error-text 死码问题，本轮只加不删，不扩范围。**
- 超时兜底：整个动作设仓库数与单请求超时（fetch AbortSignal.timeout(10s)），最坏 30×10s 太久——串行改**限并发 5**，总时长控制在十几秒级。

## Part 3: 智能过滤与草稿生成规则

### 过滤（纯函数 `src/lib/github-sync-filter.ts`，可单测）

按顺序过四道：
1. **去 merge**：message 以 `Merge pull request` / `Merge branch` / `Merge remote-tracking` 开头的一律丢；
2. **去无意义**：首行 trim 后 <10 字符丢；命中黑名单（`update` `fix` `wip` `tmp` `test` `cleanup` `minor` `typo` `init` `first commit` 等，大小写不敏感、整词匹配）丢；
3. **去重**：sha 已存在于本租户 Log.sourceCommitSha 的丢（幂等，重复点同步不产生重复草稿）；
4. **同日合并**：按 `仓库 + UTC 日期` 分组，一组产一条草稿。

### 草稿拼装（最基础规则，AI 后续再接）

| 字段 | 规则 |
|---|---|
| projectId | 虚拟项目 `github-sync`（见下） |
| slug | `gh-<repo名净化>-<yyyymmdd>`，repo 名转小写、非允许字符转连字符、压连续连字符、截断到 64 位内；撞 unique 时追加 `-2` 起序号 |
| title | 单条：commit message 首行截 120 字；合并：`<repo> · <M月D日> · N 条提交` |
| tags | `["github-sync", <repo名截24字>]` |
| beforeContent | `（等待补充）`（满足非空校验） |
| afterContent | 单条：`（等待补充）`；合并：当天 commit message 首行列表（`- <message>`），给后续改写留原料 |
| beforeDate | 当天首条 commit 的 UTC 时间 |
| afterDate | 当天末条 commit 的 UTC 时间（单条时与 beforeDate 相同） |
| lessonLearned | 空 |
| sourceCommitSha | 当天首条 commit 的 sha（去重锚点） |
| isPublished | false（草稿隔离既有规则自动生效，前台不可见） |

### 虚拟项目（决策点 D-4）

推荐：**首次同步时自动 upsert 一个本租户项目** `slug=github-sync, name="GitHub 同步", kind=tool, status=WIP, summary="自动同步的 GitHub 提交草稿"`。理由：零配置可用；用户后续可在编辑页把草稿改挂到真实项目（projectId 下拉既有能力）。不做"同步前必选项目"的阻塞式下拉——第一版先跑通，选择器留到反馈后。

## Part 4: 分步实施计划（3 个 commit）

### Commit 1：字段与加密底座
- schema：User.githubAccessToken + Log.sourceCommitSha + 唯一索引；迁移由本人执行
- 新增 src/lib/token-crypto.ts + tests/token-crypto.test.ts（往返、篡改、哑钥）
- auth.ts jwt 回调截获 access_token 加密落库
- 环境变量三处同步（.env.example / .env.production.example / compose 透传 + preflight 校验）
- 门禁：lint/tsc/test/build + 材料重出（新文件吃窗口，拒件即停报）
- 验收判据：本人重登一次后库里 githubAccessToken 非空且为密文形态（三段 base64），页面与会话无 token 痕迹

### Commit 2：同步引擎与动作
- 新增 src/lib/github-sync.ts（API 调用 + 编排）、src/lib/github-sync-filter.ts（四道过滤纯函数）+ tests/github-sync-filter.test.ts（merge/黑名单/去重/同日合并/slug 净化）
- 新增 src/app/admin/sync-actions.ts；error-text.ts 加 SYNC_001-003
- 虚拟项目 upsert；草稿经 saveLog 同一入口写入（不绕校验）
- 门禁同上；过滤逻辑全部纯函数单测覆盖
- 验收判据：本人点同步后 github-sync 项目下出现草稿、重复点击不增行、前台不可见

### Commit 3：UI 与文档收口
- /admin 概览页加 [ 从 GitHub 同步 ] 按钮与 `?synced=N&skipped=M` 结果横幅（含"未绑定请先重登"引导）
- **配套闸门（单列）**：/privacy 页"访问令牌不落库"段改写为"加密落库、仅用于同步"；说明书 4.6/5.1/七章同步；SPEC 新增 F 编号（需点名）；材料重出
- 门禁同上 + 浏览器实测三条判据（按钮态/结果横幅/草稿可见性）
- 验收判据：无 token 时按钮引导重登而非报错；有 token 时同步结果可截图留证

## 决策点汇总（等裁定）

| 编号 | 问题 | 推荐 |
|---|---|---|
| D-1 | OAuth scope 是否加 `public_repo`/`repo` | 第一版**不加**，只同步公开仓库（当前 scope 够用）；私有仓库需求出现再加 `repo` 并全员重登 |
| D-2 | 按钮落点 | /admin 概览"最近动态"区头（没有日志列表页） |
| D-3 | 去重机制 | Log.sourceCommitSha + 租户内唯一索引（幂等），不用时间游标 |
| D-4 | 草稿默认项目 | 自动 upsert 虚拟项目 github-sync，编辑页可改挂 |

## 范围外（本轮不做）

Cron 轮询、Webhook、AI 改写 BEFORE/AFTER、私有仓库、同步进度条/后台任务队列、已同步草稿的增量更新（commit  amend 后 sha 变了会产新草稿，旧草稿自行删除）。