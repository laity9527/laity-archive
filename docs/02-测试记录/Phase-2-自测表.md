# Phase 2 自测表：前台三页完整版 + 安全封装

作者：张磊
日期：2026-10-30
对应：DESIGN.md Phase 2 验收标准
说明：粘贴真实执行输出；数据库未就绪的运行期项目如实标注，等 WSL2 解除后回填。

---

## 一、验收标准逐条核验

| # | 验收标准 | 执行命令/操作 | 预期结果 | 实际输出（粘贴） | 判定 |
|---|---|---|---|---|---|
| 1 | 草稿隔离：/、/logs 不出现，直访详情 404 | 造 isPublished=false 数据后访问三页 | 均不可见，详情 404 | 未执行：数据库未起 | 未验证 |
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
| 越界文件 | 对照 DESIGN.md Phase 2 清单 | 多改 prisma/seed.ts（Phase 2 验收第 2 条要求种子数据带合法哈希，D5 口径现算）；其余均在清单内，未提前建 Phase 3 的 projects 数据层 |
| 配置变更 | — | 详情页新增 `export const instant = false`：框架要求未发布 slug 必须阻塞渲染才能返回真 404，属路由段配置，非 build/CI 配置 |
| 密钥入库 | git status | `.env` 仍被忽略，未入库 |

## 五、留痕检查

| 检查项 | 结果 |
|---|---|
| 新增 .ts/.tsx 均有文件头注释 | PASS（markdown.tsx、Timeline、StatusBoard、Seal、logs/[slug]/page.tsx） |
| 修改文件追加修改记录行 | PASS（layout、globals、page、logs/page、logs.ts、seed.ts） |
| docs/01 有本 Phase 研发日志 | 已追加 |
| docs/03 带地址栏截图 | 待补：数据库起后截三页 + 375px |
| 独立 commit | 未提交，等运行期验收回填后再提交 |

## 六、结论

- 判定：**条件性 PASS**——代码、构建、lint、视觉、清洗、字体六项通过；运行期三项（草稿隔离、印章展示、375px）因数据库未起未验证。
- 解除阻塞动作：WSL2 装好后 `docker compose up -d` → `npx prisma migrate dev` → `npx prisma db seed` → 回填第 1/2/5 条 → 截图 → 独立验收 → commit。
- 范围外发现：I006——.gitignore 的 `logs` 规则把 `src/app/logs/` 整个忽略，Phase 1 的日志大厅与本次详情页此前都未入库；本 Phase 提交时已用 `!src/app/logs/` 重新纳入并核对 `git status`。I004 仍开放。
