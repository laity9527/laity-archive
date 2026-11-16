# 附录 A · 视觉与设计令牌（B0 定稿）

本文是 B0 之后全站唯一的视觉真值。改这里就改全局；**不允许在页面里写第二处字面量**。

---

## 一、色板

### 1.1 亮色（现行，纸白）

| 名称 | 值 | 用途 | 对比度（实算） |
|---|---|---|---|
| paper | `#f4f1ec` | 页面底、卡片底 | — |
| ink | `#1a1a18` | 正文、标题、链接、焦点环 | 15.47:1 on paper |
| ink-soft | `#625d53` | 辅助文字、元信息、占位 | 5.81:1 on paper |
| hairline | `#d9d2c5` | 1px 分隔线（装饰性，豁免 3:1） | 1.33:1（仅留档） |
| brown | `#7a5a3a` | 强调：当前项、hover 下划线、进度、mark 底 | 5.56:1 on paper |
| mark 前景 | `#f4f1ec` | 棕底上的字 | 5.56:1 on brown |

### 1.2 暗色（B1-a 已落地，暖黑）

| 名称 | 值 | 用途 | 对比度（实算） |
|---|---|---|---|
| paper | `#141311` | 页面底（暖黑，不是 #000） | — |
| ink | `#e8e3da` | 正文、标题 | 14.53:1 on paper |
| ink-soft | `#a8a196` | 辅助文字 | 7.25:1 on paper |
| hairline | `#3a352d` | 1px 分隔线（装饰性） | 1.53:1（仅留档） |
| brown | `#c08a5a` | 强调（暗色下提明度，色相不变） | 6.21:1 on paper |
| mark 底 | `#5a4128` | 搜索高亮（暗色） | 7.40:1 with ink |

规则：
- 暗色**只覆盖语义层**，原始色相不动；不允许为暗色另造品牌色。
- 正文不用 `#fff` / `#000` 纯色对：长时间阅读会发涩。
- 棕在暗色下可以提明度，但**不允许**用于大面积填充（标题、按钮底、卡片底）。

落地形态（2026-11-16 已实现于 `globals.css`）：`html[data-theme="dark"]` 覆盖
`--background` / `--foreground` / `--color-ink-soft` / `--color-hairline` / `--color-brown`，
Tailwind 的 `var()` 工具类自动跟随——**前提是 `@theme` 而不是 `@theme inline`**：
inline 会把色值直接内联进工具类（实测 `.text-ink-soft{color:#625d53}`），覆盖变量对它们无效，
暗色就成了“底变了、字没变”；首屏由 `layout.tsx` 的阻塞脚本先定主题（localStorage 优先，否则跟系统），
`ThemeToggle` 用 `useSyncExternalStore` 订阅 `documentElement.dataset.theme`。
搜索高亮在暗色下单独改：`background #5a4128` + 字 `#e8e3da`（7.40:1）——棕底配黑字只有 2.34:1，不能用。
打印时 `@media print` 在同一个选择器列表里重申黑字白底（`html[data-theme]` 优先级高于 `:root`）。

---

## 二、语义令牌（落地形态）

```css
:root {
  --bg: #f4f1ec;
  --bg-raised: #f4f1ec;      /* 亮色下与底同色，靠线分层；暗色下略提亮 */
  --fg: #1a1a18;
  --fg-muted: #625d53;
  --fg-subtle: #625d53;      /* 预留，暂与 muted 同值 */
  --accent: #7a5a3a;
  --line: #d9d2c5;
  --line-strong: #1a1a18;
  --danger: #8a2f24;
  --success: #2f5a3f;
  --warning: #7a5a1a;
  --radius: 0px;             /* 唯一圆角值；浮层 4px 例外 */
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --ease: cubic-bezier(.2,.6,.2,1);
}

html[data-theme="dark"] {
  --bg: #141311;
  --bg-raised: #1b1916;
  --fg: #e8e3da;
  --fg-muted: #a8a196;
  --fg-subtle: #8f8578;
  --accent: #c08a5a;
  --line: #3a352d;
  --line-strong: #e8e3da;
}
```

`danger/success/warning` 只允许出现在后台状态与错误横幅，不进前台正文。

---

## 三、间距（十档，白名单）

| 令牌 | 值 | 典型用法 |
|---|---|---|
| space-1 | 4px | 图标与文字、徽章内 |
| space-2 | 8px | 行内元素间距 |
| space-3 | 12px | 标签行、元信息 |
| space-4 | 16px | 段落间距、表单行 |
| space-5 | 24px | 卡片内边距 |
| space-6 | 32px | 区块内小节 |
| space-7 | 48px | 区块之间（紧凑） |
| space-8 | 64px | 区块之间（默认） |
| space-9 | 96px | 大区块（首页三段之间） |
| space-10 | 128px | 页面首尾留白 |

规则：
- 禁止 5 / 7 / 10 / 14 / 18 / 20 / 22 / 36px 这类手写值。
- 页面容器：桌面左右 24px（`px-6`），首页与大厅内容宽 1200px，详情外框 1080px + 正文 720px。

---

## 四、字号阶

| 令牌 | 桌面 | 移动 | 行高 | 用途 |
|---|---|---|---|---|
| display | clamp(40px, 5.2vw, 56px) | 同（下限 40） | 1.08 | 首页主标语 |
| h1 | 32px | 28px | 1.25 | 页面标题、日志标题 |
| h2 | 24px | 22px | 1.35 | 区块标题 |
| h3 | 20px | 18px | 1.4 | 列表标题 |
| body-lg | 18px | 17px | 1.85 | 日志正文（宋体） |
| body | 15px | 15px | 1.75 | 界面正文（Inter） |
| meta | 12px | 12px | 1.5 | 元信息、徽章、导航 |
| micro | 10px | 10px | 1.4 | 编号、等宽标签（仅英文/数字） |

规则：
- **界面文字不再用 11px 及以下**（中文在此尺寸下笔画糊）。10px 只允许数字与英文标识。
- 中文标签走 Inter，不加宽字距；英文标识（BEFORE / AFTER / LAITY）走等宽并可加 0.18em 字距。

---

## 五、线重三档

| 档 | 值 | 用途 |
|---|---|---|
| hairline | 1px `--line` | 列表行之间的分隔 |
| ink | 1px `--line-strong` | 区块起止、表格表头、印章外框 |
| double | 1px + 1px（间隔 2px） | 只在详情页头部与印章区，强调"凭据"语义 |

层级由"线 + 留白"表达，**不用阴影**；阴影只允许出现在 dialog / dropdown / toast。

---

## 六、圆角、阴影、动效

- 圆角：内容与控件一律 `0`；浮层（dialog/dropdown/toast）`4px`。
- 阴影：`0 1px 2px rgb(0 0 0 / .04)` 仅浮层；正文与卡片永不加阴影。
- 动效：
  - hover：颜色与下划线 `120ms linear`；
  - 进入：`opacity 0→1` + `translateY(4px→0)`，`180ms`；
  - `prefers-reduced-motion: reduce` 下全部关闭；
  - 不做视差、不做滚动缩放、不做 View Transitions。

---

## 七、图标（14 个，自绘）

`src/components/icons/`，24×24 viewBox，`stroke="currentColor"`，`stroke-width="1.5"`，无填充。

| 名 | 用途 |
|---|---|
| search | 命令面板入口 |
| sun / moon | 主题切换 |
| home | 后台侧栏-概览 |
| file-text | 后台侧栏-日志 |
| folder | 后台侧栏-项目 |
| settings | 后台侧栏-设置 |
| plus | 新建 |
| edit | 行内编辑 |
| trash | 删除 |
| external-link | 仓库/外链 |
| copy | 复制 |
| check | 成功/已复制 |
| alert | 错误/告警 |
| close | 关闭浮层 |

规则：图标只做"辅助识别"，**任何图标都必须有文字或 aria-label**；不允许出现只有图标的导航项。

---

## 八、组件规格（B0 落地 4 个，B1 补齐其余）

### 8.1 SectionHead（B0）
```
[01]  精选项目 —————————————————————— 全部作品 →
```
- 编号：mono 10px，`--fg-muted`；标题：sans 12px，字距 0.16em，`--fg-muted`；
- 右侧动作：12px，`--fg`，下划线 `--line`，hover 变 `--line-strong`；
- 底部 1px `--line`，上下 padding 12px / 16px。

### 8.2 Breadcrumbs（B0）
- 12px，`--fg-muted`；分隔符 `/`（mono）；当前页 `aria-current="page"` 且 `--fg`；
- 与标题间距 24px。

### 8.3 CodeBlock（B0）
- 外框 1px `--line`，内边距 16px；顶部一行：语言标签（mono 10px，`--fg-muted`）+ 复制按钮（12px）；
- 代码 13px / 行高 1.7，等宽；横向滚动，不换行；
- 不做语法高亮（裁定见主方案 ③ 与附录 C）。

### 8.4 ZoomableArticle（B0）
- 包裹正文；点击 `<img>` 打开浮层（`role="dialog"`，`aria-modal`），底衬 `rgba(0,0,0,.72)`；
- 关闭：点击底衬 / Esc / 关闭按钮；关闭后焦点回到触发的图片；
- 图片最大 90vw × 85vh，`object-fit: contain`。

### 8.5 其余（B1）
Button / Input / Textarea / Select / Field / Badge / Card / ListRow / EmptyState / Skeleton /
Dialog / Toast / Tabs / Pagination / Toc / Seal。规格在 B1 开工时按同一套令牌展开。

---

## 九、打印（B0 落地）

```css
@media print {
  :root { --bg: #fff; --fg: #000; }
  body { background: #fff; color: #000; }
  .no-print { display: none !important; }   /* 导航、目录、进度条、复制、灯箱 */
  .print-full { max-width: none !important; padding: 0 !important; }
  .log-body { font-size: 12pt; line-height: 1.7; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #444; }
  .code-block { break-inside: avoid; }
  h1, h2, h3 { break-after: avoid; }
}
```
印章区**不隐藏**（打印场景下它正是要被带走的那一页）。

---

## 十、反模式清单（出现即返工）

1. 圆角除 `0` 与浮层 `4px` 之外的任何值。
2. 卡片加阴影、加渐变、加彩色底。
3. 11px 及以下的中文正文/标签。
4. 手写非十档间距。
5. 棕色用于按钮底、卡片底、大标题。
6. 图标单独承担语义（无文字、无 aria-label）。
7. 一个页面出现两个"最大最黑"的视觉焦点。
8. 用 `!important` 覆盖令牌（打印样式除外）。
