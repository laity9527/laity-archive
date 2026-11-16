# 附录 C · 工程落地与分批实施

配套：`重构方案-V3-2026-11-16.md`、附录 A（令牌）、附录 B（IA 与逐页规格）。

---

## 一、目录与分层（目标态）

```
src/
  styles/                  ← B1 拆出（B0 先留在 globals.css）
    tokens.css             ← 语义层 + 暗色覆盖
    base.css               ← reset / 排版基线 / 焦点 / 选区
    layout.css             ← 容器、栅格、间距
    components.css         ← 按钮 / 输入 / 卡片 / 列表 / 目录 / 印章
    markdown.css           ← .log-body 全部规则
    print.css              ← 打印
  components/
    ui/                    ← 原子组件（B1）
    layout/                ← SiteNav / SiteFooter / ThemeToggle / CommandPalette
    feature/               ← SectionHead / Breadcrumbs / CodeBlock / ZoomableArticle / Timeline / Seal / Toc
    icons/                 ← 14 个自绘 SVG（B1）
  lib/                     ← 数据访问与纯函数（不变）
```

**B0 的取舍**：不新建 `styles/` 目录（拆文件会让 Tailwind 的 `@source` 兜底与产物哈希同时变化，
收益要到 B1 才显现）。B0 只往 `globals.css` 追加三段：打印、代码块、图片。B1 统一搬家。

---

## 二、B0 组件清单（本轮新增）

| 文件 | 类型 | 职责 | 依赖 |
|---|---|---|---|
| `src/components/SectionHead.tsx` | Server | 编号 + 标题 + 右侧动作 + hairline | 零 |
| `src/components/Breadcrumbs.tsx` | Server | 层级导航，末项 `aria-current` | 零 |
| `src/components/CodeBlock.tsx` | Client | 语言标签 + 复制按钮 + 横向滚动 | `CopyButton` 的 clipboard 逻辑（内联，避免多一层） |
| `src/components/ZoomableArticle.tsx` | Client | 包裹正文，图片点击开灯箱，Esc/焦点归还 | 零 |
| `src/lib/markdown.tsx`（改） | Server | `pre` 改为渲染 `CodeBlock`，语言从 className 取 | 上述 |
| `src/app/page.tsx`（改） | Server | 首页重排 | `SectionHead` |
| `src/app/u/[handle]/logs/[slug]/page.tsx`（改） | Server | 面包屑、区块头、正文包裹、打印类 | 上述 |

不做：图标集（B1）、暗色开关（B1）、命令面板（B4）。

---

## 三、数据模型（B4 才动，B0 零变更）

```prisma
model Log {
  // 已有字段不动
  tags          String[]   // 显示名（原始大小写）
  tagsKey       String[]   // 新增：小写规范键，查询与 URL 用
  series        String?    // 新增：系列/合集
  featured      Boolean @default(false)   // 新增：手动精选
  pinnedAt      DateTime?  // 新增：置顶
  @@index([tags], type: Gin)
  @@index([tagsKey], type: Gin)
}

model PreviewToken {   // 新增：草稿只读预览
  id        String   @id @default(cuid())
  token     String   @unique
  logId     String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model AuditEvent {     // 新增：后台操作审计
  id         String   @id @default(cuid())
  actorId    String
  action     String
  targetType String
  targetId   String
  meta       Json?
  createdAt  DateTime @default(now())
}
```

迁移原则：
- 一次迁移只加可空字段或带默认值的字段；`tagsKey` 允许为空，读取时 `tagsKey.length ? tagsKey : tags.map(lower)`。
- 回填脚本幂等（按 `id` 回写），失败可重跑。
- 不给 `Log` 加软删除：现有"下架"已满足语义。

---

## 四、性能预算（重构期间不放松）

| 指标 | 阈值 | 核对方式 |
|---|---|---|
| 任一前台页 Prisma 调用 | ≤3（`/logs` ≤2，详情 ≤2） | dev 开 `log_statement=all`，数 `execute` 行（Prisma 语句在 execute，不在 statement） |
| 首屏 JS 增量 | ≤15KB（相对 B0 前） | `next build` 的 route size 对比 |
| 首屏字体传输 | ≤120KB | 网络面板，CJK 分片按需 |
| LCP | ≤2.0s（本地生产构建 + 4G 节流） | Lighthouse |
| CLS | ≤0.05 | 图片必须带宽高比 |

B0 的具体约束：首页不新增客户端组件（`SectionHead` 是 Server）；
详情页只新增 `CodeBlock` 与 `ZoomableArticle` 两个小组件，按需 hydrate。

---

## 五、测试

| 层 | 现状 | B0 增量 | 后续 |
|---|---|---|---|
| 纯逻辑（node --test） | 192 条 | 不加（B0 无新纯函数） | 标签双轨键、归档分组、导入冲突 |
| 组件 | 无 | 不加 | B1 起按需（不引测试库，用 node --test + 纯渲染断言不现实，改为 E2E 覆盖） |
| E2E | 无 | 不加 | B5：登录→新建→发布→前台可见→下架 5 条 |

B0 的验收以"四道门禁 + 渲染产物抽查"为准：
- `npm run lint` / `npx tsc --noEmit` / `npm run build` / `npm test`
- 抽查渲染 HTML：面包屑存在且 `aria-current` 唯一；代码块有语言标签；正文图片可被灯箱接管（DOM 存在 `img`）。

---

## 六、分批实施（含 DoD）

| 批次 | 内容 | DoD | 预估 |
|---|---|---|---|
| **B0**（本轮） | 令牌补三段、首页、详情、4 个组件 | 四道门禁全绿；两页三档截图；打印预览无 UI 元素 | 1–2 人日 |
| **B1-a** ✅ | 15 个自绘图标、主题系统（暗色语义层 + 切换 + 无闪白脚本） | **已完成 2026-11-16**：tsc/lint/test(192)/build 全绿；`/about` 产物含主题脚本与 `aria-pressed`，页面实际引用的 CSS 含 3 处 `data-theme` 与暗色背景值 | 0.5 人日 |
| **B1-b** | `styles/` 拆分、12 原子组件、Toast、Skeleton | 暗色下正文 ≥7:1（实算）；组件在 3 页以上复用 | 2.5–3.5 人日 |
| **B2** | 其余前台 10 页重排、导航四项（"标签"待 B4） | 每页三档无横滚；键盘可达 | 5–7 人日 |
| **B3** | 后台侧栏、概览、行内操作、批量、编辑器工具栏、设置 | 行内发布即时生效；破坏性操作二次确认 | 5–6 人日 |
| **B4** | ⌘K、`/tags`、`/archive`、草稿预览、导入、OG 图、JSON Feed | 标签双轨 308 生效；OG 图 1200×630 可访问 | 4–5 人日 |
| **B5** | 动效、A11y 复核、性能实测、E2E、文档重写 | 现状说明书定稿；旧编号封存 | 2–3 人日 |

依赖：B1-a → B2/B3（可并行）→ B4 → B5。B0 独立，不阻塞。

**B2 进度（2026-11-16）**：第一批已完成日志大厅 `/logs`——左栏当前项改为棕左线（与详情页目录同一语言）、
搜索框并入顶栏并限宽 320px、结果行改“共 N 条 / 本页 N 条”、列表行距 40→32px、元信息 11→12px；
筛选与搜索逻辑一字未动。本轮同时把 B0/B1-a 新增的 6 个组件登记进收录清单 ③，
并把 `SiteNav` 自 ④ 平移进 ③（导航外壳，判定逻辑在 routes.ts、交互在 ThemeToggle），
材料重出后后窗口余量 **105 行**（生成器阈值 100）——下次改版面需留意这个紧余量。

**B2 第二批（2026-11-16）**：作品档案页 h1 44→32px、头部加 ink 收边线、元信息 11→12px；
租户主页标题 36/48→32px、副标 18→15px、头部加 ink 收边线。两页均在折走段 ③。

**B2 第三批（2026-11-16）**：全站页面标题统一到 32px——`/tags/[tag]`（步 44）、`/about`、`/login`、
`not-found`、`error`、`/privacy`、`/licenses`（步 30/36/40）全部改为 `text-[32px]`。
至此 B2 除「导航加标签入口」（依赖 B4 的 `/tags`）外已收口。

**B1-b 第一批（2026-11-16）**：新增 `Toast`——后台操作回执从“页内横幅 + URL 参数”改为右下角浮层：
成功类 4.5s 自动收起并清掉查询串（刷新不重复），错误类保持到手动关闭（错误码可截图）；
文案仍走 `error-text` 单源，未知码不原样回显。挂在 `admin/layout.tsx`（Suspense 包住，`useSearchParams` 需要边界）。
实现上消息改为渲染期派生（参数→文案是纯映射），只记“已关闭哪一条”，以避开 `react-hooks/set-state-in-effect`。

**材料阻塞（如实记录）**：本轮把 `src/app/layout.tsx` 也平移进 ③ 后，后窗口余量恢复，
但生成器改报“切口第 12701 行是空行”而拒件；在 ③ 增删注释行不影响切口（③ 为折叠段，
不进渲染行流），而在 ④ 增行会同时改变总行数与容量、切口位置不变。
按经验裁定：**不在本轮为凑边界而增删无意义代码**，材料统一在 B5 重出——
届时先确认 ④ 的总行数跨过一个 50 行页边界，让切口落到源码行上。
本轮 commit 包含 BANDS 登记与代码，**不含重出的 HTML**；当前 `docs/04` 对应上一轮源码，已知不一致。
**重整理由（2026-11-16）**：主题与图标是所有后续页面的前置（导航、后台侧栏、空态都要用），
而样式文件拆分是纯结构改动、Toast 依赖具体页面接入——把有依赖的先做完，B2 就不会被 B1-b 卡住；
B1-b 可与 B2 并行。

---

## 七、文档迁移（裁定 ③ 的执行细则）

1. 新建 `docs/现状说明书.md`，五章：
   一、这是什么（定位与形态）；二、数据与口径（模型、摘要、标签双轨）；
   三、页面与路由（对照表 + 状态矩阵）；四、工程与运维（构建、部署、环境变量、性能预算）；
   五、变更记录（日期 + 一句话 + 影响面）。
2. 旧三份移入 `docs/archive/2026-11-16-旧编号体系/`，文件头加封存声明。
3. `README.md` 的"文档导读"改为指向现状说明书 + 三份附录 + 研发日志。
4. 代码注释里的 D##/F##/I### 不改写（改注释等于全仓翻动）。
5. 软著材料在 B5 统一重出一次，避免分批出件造成版本错位。

---

## 八、回滚策略

| 场景 | 动作 |
|---|---|
| B0 方向被否 | `git revert` 本轮 commit；令牌与组件可单独保留（互不依赖） |
| B1 样式拆分出问题 | 保留 `globals.css` 原文件，`styles/` 只做 `@import`，回滚即删目录 |
| B3 后台改坏写路径 | 写路径不在 B3 改动范围（只加行内入口，复用既有 Server Action） |
| B4 标签迁移失败 | `tagsKey` 可空 + 读取回落 `tags` 小写，旧逻辑继续可用 |
| 任何批次 | 每批独立 commit，commit 信息带批次号（B0/B1/…），便于单批回退 |

---

## 九、依赖政策（红线之外仍守）

- B0–B5 全程**不新增运行时依赖**：图标自绘、图表纯 CSS、OG 图用内置 `next/og`、
  代码高亮不做、命令面板自研。
- 若确需引入，必须同时给出：体积、可替代方案、回退路径、许可证，一次性决定。
- devDependencies 仅在 B5 评估 Playwright（E2E），其余不加。

---

## 十、B0 交付清单（本轮）

1. 四份方案文档（主方案 + 附录 A/B/C）。
2. `globals.css`：打印、代码块、图片三段样式。
3. `SectionHead`、`Breadcrumbs`、`CodeBlock`、`ZoomableArticle` 四个组件。
4. `markdown.tsx` 接入代码块。
5. 首页与详情页重排。
6. 四道门禁全绿 + 渲染产物抽查结果（写在交付说明里，不新建文档）。
