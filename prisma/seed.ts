/**
 * 文件：prisma/seed.ts
 * 描述：开发种子数据：厂牌项目 + 12 条已发布日志，正文按 Markdown 源文内联，摘要按 D5 口径单源现算，全部 upsert 保证幂等
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-10-30: 按 D5 口径为种子日志计算 contentHash，供 Phase 2 详情页印章展示
 * - 2026-11-02: 哈希口径改读 src/lib/content-hash.ts，不再自带一份实现
 * - 2026-11-06: 由「1 项目 1 条演示日志」扩为「1 项目 12 条已发布日志」（负责人点名把本地注入的 12 篇写进种子）；正文与经验总结按 slug upsert 且 update 为空，重复执行既不报错也不生成副本；publishedAt 取库中历史真值，contentHash 仍调用 src/lib/content-hash.ts 现算、不自带第二份实现；旧的 earth-mirror / prebuild-index 演示条目退出种子
 * - 2026-11-09: V2.0 Step 2：复合唯一 @@unique([userId, slug]) 落地后 where: { slug } 不再是合法唯一键，
 *               开头先 upsert 测试用户（handle zhanglei / email zhanglei@example.com），全部 Project/Log 的
 *               upsert 改走 userId_slug 复合键、create 带 userId——先有 User 才能写档案（负责人任务 1）
 */
import { PrismaClient } from "@prisma/client";
import { computeContentHash } from "../src/lib/content-hash.ts";

const prisma = new PrismaClient();

const PROJECT = {
  slug: "laity-archive",
  name: "Laity 项目档案库",
  kind: "product",
  status: "WIP",
  summary: "个人全栈数字档案库：厂牌官网 + 开发复盘证据链，兼作软著登记的实物来源。",
  repoUrl: "https://github.com/laity9527/laity-archive",
};

// 正文内联为 Markdown 源文，是为了空库也能重建出同一份档案；publishedAt 用库里的历史真值，
// 这样重建后详情页的印章串与今天可核对的值完全一致（改一个正文字符，摘要就会变）
// 正文里出现的 \r 是有意转义：库里《把档案库本身当成第一条真实入库数据》的 BEFORE 段含一个回车符，
// 裸写在模板字面量里会被归一成 LF，摘要就不一致了；逐字段回读比对已确认 12 条全部与库中原文相等
type SeedLog = {
  slug: string;
  title: string;
  tags: string[];
  beforeDate: string;
  // afterDate 可空：库里第 0 篇《把档案库本身当成第一条真实入库数据》至今是「进行中」，时间轴按 SPEC F02 画空心节点
  afterDate: string | null;
  publishedAt: string;
  beforeContent: string;
  afterContent: string;
  lessonLearned: string;
};

const LOGS: SeedLog[] = [
  {
    slug: "d30-four-step-token-switch",
    title: "D30 四步切换：四类漂移点一次改全、回退值要先验框架、对比度只认实算",
    tags: ["视觉令牌", "Tailwind v4", "WCAG", "同 commit 同步"],
    beforeDate: "2026-11-05T14:00:00.000Z",
    afterDate: "2026-11-05T18:30:00.000Z",
    publishedAt: "2026-11-06T05:42:05.491Z",
    beforeContent: `## 风险不在改值，在「改一处忘一处」

外部三份设计产物（优化方案、整合方案、原型 HTML）一致收敛到 \`#f4f1ec\` 一组语义化令牌，而仓库实测值是 \`#FBFBF9\` 一档灰阶。同一个颜色在四个地方各写了一遍字面量：两个令牌、\`:focus-visible\` 的 outline、以及 \`src/proxy.ts\` 里拼出来的 404 内联 HTML（它拿不到 CSS 变量）。

换令牌等于全站视觉变更，还牵动作废已登记十轮的软著材料。更麻烦的是设计稿暗示「切到新令牌体系顺带把对比度问题解决掉」——这句话没被验过。`,
    afterContent: `## 一、四类漂移点一次改全

- **纸白** → \`--background\`：\`--color-paper\` 改为引用它，Proxy 内联页背景同步；
- **A1 主墨** → \`--foreground\`：\`--color-ink\` 与 \`:focus-visible\` 由字面量改为引用它，Proxy 三处主墨（body 文字、链接文字、a:hover 下边框）；
- **A2 辅助灰** → \`--color-ink-soft\`：\`blockquote\` 的回退值整个去掉，Proxy 两处同步；
- **A3 极细线** → \`--color-hairline\`：Proxy 的 \`a\` 下边框 \`#E7E7E2\`，**绑同一条 commit**。

A3 那批我把 \`--color-hairline\` 与 Proxy 的字面量绑进同一条 commit，理由很直白：分两条就会出现「全站暖线、404 页冷线」的中间态，正是这一天要消灭的那类漂移。

## 二、去掉回退值之前先验框架行为

\`blockquote\` 原写 \`var(--color-ink-soft, #5c5c5c)\`。去回退值之前先实测产物 CSS，确认 \`@theme inline\` 真会输出 \`--color-ink-soft:#625d53\` 且 \`color:var(--color-ink-soft)\` 成立——**如果 Tailwind 只做内联替换不落真实变量，去掉回退值会静默失效**。

## 三、对比度只认实算，不认设计意图

按 WCAG 2.1 相对亮度公式对源码实抽的前景/背景配对逐对计算，结论是切完之后 1px 分隔线仍只有 **1.33:1**（草稿给的 \`--rule-strong\` 也只有 1.91:1），真要达 3:1 线色须压到 \`#948a77\` 一档，那就失去「极细线」观感。文本层没问题：最差 5.56:1，与切换前的 6.45:1 同属「AA 达标、未达 AAA」一档，切换不改变合规档位。

处置分两刀：线层按「装饰性分隔线、非功能性组件边框」裁定豁免（I073 WONTFIX），同时把实算值留在文档里并注明**仅作留档、不作验收门槛**——豁免是裁定，不是数据被推翻，两件事必须同时留档。

## 四、层间区分度用浏览器实测收口

两级文字色差由 2.78:1 降到 2.66:1，被定为 A4 的实测验收项。起 dev 用应用内浏览器读 hydrated DOM，扫三页所有直接承载文本的元素按 \`color × font-size\` 分组：辅助灰在 16px 及以上只有首页 hero 一段（18px），而同容器正文是 36px 标题——**字号始终同向变化，没有任何一处层次要靠 2.66:1 的颜色差单独承担**，判据通过，不改色值也不 \`git revert\`。

唯一未覆盖的潜在场景是 \`.log-body blockquote\`（18px 宋体 + 辅助灰，与正文同字号同字族），当前没有内容可测 → 挂 I075 OPEN，回退预案写死「只 \`git revert\` A2 单步、不跨步调整」，并注明 revert 会连带恢复回退值、而回退值与恢复后的令牌值恰好相同，不会留下坏引用。

## 五、窗口与强调色

A1 那一步「只改了两行注释」就顶破材料窗口、第八次被 \`assertWindowFit()\` 拒出件；让位者按「折排版不折逻辑」选——67 行的 \`StatusBoard.tsx\` 而非 62 行的 \`Timeline.tsx\`，判断依据是 SPEC 是否点名了该文件的形态（F02 点名 Before/After 时间轴，不折）。

B1 引入全站唯一强调色 \`--brown #7a5a3a\`，只给持久导航当前项（非文本对比实算 5.56:1）。落地后发现首页的「当前态」由字标承担、仍是主墨，棕色只出现在其余三页——我没有顺手改，而是把这条不一致原样记进三份文档等点名，最终由 B1 补单独一条 commit 兑现「任何时刻全站只有一个元素带棕色下划线」。`,
    lessonLearned: `视觉切换的返工成本集中在「改了 A 忘了 B」：同一颜色在几个地方各写一遍，就必须用引用制单源 + 同 commit 同步点把它锁死。合规数字与设计意图冲突时，按裁定豁免并留实算，而不是偷偷改色值让文档与实现互相说谎。`,
  },
  {
    slug: "container-query-not-viewport-query",
    title: "首页两栏与容器查询：视口断点不等于栏宽，祖先没有 @container 查询就不生效",
    tags: ["响应式布局", "@container", "flex gap", "窗口非线性", "favicon"],
    beforeDate: "2026-11-06T10:20:00.000Z",
    afterDate: "2026-11-06T11:10:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 布局改完，数字不对

桌面端把主体分成两栏（精选项目 2/3，档案状态与最新日志堆在 1/3），代码写完 lint / tsc / build 全绿。但把几何量出来才发现：右栏 344px 里，\`md:flex-row\` 与 \`md:w-[200px]\` 仍然按**视口**宽度生效——200px 时间轴 + 40px gap 之后，标题只剩 **56px**，20px 字号折成 **13 行、364px 高**。

这不是「稍挤」，是不可读。而它恰好是「视口断点当栏宽用」这个经典陷阱：断点判的是浏览器窗口，组件却被放进了一个由父级决定的盒子里。`,
    afterContent: `## 一、容器查询，而且要成对量

右栏加 \`@container\`（\`container-type: inline-size\`），日志行的横排条件从 \`md:flex-row md:gap-10\` 改为 \`@[36rem]:flex-row @[36rem]:gap-10\`；再把 \`Timeline\` 根节点的 \`md:w-[200px]\` 改成 \`@[36rem]:w-[200px]\`。

第二步才是关键：\`Timeline\` 有**四处**调用点（首页、日志大厅、日志详情、项目详情），容器查询的祖先若没有 query container 就永不命中——只改组件会让满宽页的时间轴整窄化掉。所以四处各自补上 \`@container\` 承载元素。

复测成对给数：窄栏正文 56px → **296px**、标题 13 行 → **2 行**；宽容器（1032px）时间轴仍 **200px**、标题 1 行；375px 视口下 \`display: block\`、右边框 \`0px\`、内边距 \`0px\`，完整回落单列。

## 二、flex gap 会咬字体混排

把「1 篇日志」拆成 sans、日期拆成 mono 之后，两段之间出现一道 24px 的空隙——它们是 \`<li class="flex gap-x-6">\` 的直接子元素，**gap 只认 flex 子项关系，不认「语义上是一组」**。改法：两段包进同一个外层 span，外层只留 \`ml-auto\` 与字号色。量得 innerGap 0px、两段 top 差 0px、格子右缘与行右缘齐平 0px。

顺带定了一条：带日期的格子不能整行改 sans，因为视觉铁律强制时间戳等宽——合规约束优先于「看起来更统一」。

## 三、量不到布局时的正解

首页是 \`◐\` PPR 路由，动态段挂在 \`<template>\` 里不参与布局，\`getBoundingClientRect()\` 全是 0；\`/admin\` 又需要登录。正解是当场建 iframe + \`srcdoc\` 复制本站样式表并给显式宽度——媒体与容器查询按 iframe 自己的视口生效，量完即删。应用内浏览器面板不可见时 \`take_screenshot\` 直接报 \`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE\`，几何实测能替代结论，但**不能替代 \`docs/03\` 的截图交付物**。

## 四、野生文件先查身份

\`public/favicon.ico\` 冒出一份与 \`src/app/favicon.ico\` MD5 完全相同的副本（未跟踪、不在 \`.gitignore\`）。先查身份（\`md5sum\` / \`git log -- path\` / \`git check-ignore -v\`）再决定，不静默提交也不静默删；确认后删除，并且**不给 \`metadata.icons\` 加配置**——App Router 的约定文件已自动注入 \`<link rel="icon">\`，再加一层就是双源。

## 五、窗口容量是非线性的

开工第一步先让位：\`licenses/page.tsx\`（109 行）自 ④ 平移进折走段 ③，后窗口余量 41 → 150。随后 ③ 段涨 11 行跨过总行数 6750 的页界，页数 135 → 136、末页 47 → 8 行、容量 1497 → 1458，余量当场掉到 **105**。结论修正成一句可复用的话：**往折走段加行同样吃后窗口，因为容量随末页行数跳变**；而前窗口只剩 17 行，这就是本版停止再加「锦上添花」的物理原因，不是审美决定。`,
    lessonLearned: `组件的响应式条件必须挂在它真正所在的那个盒子上：祖先没有 query container，容器查询就永不生效；而断点挂在视口上，窄栏里的组件就会替视口买单。布局类改动一律先量几何（窄容器与宽容器成对给数）再宣布完成。`,
  },
  {
    slug: "ui-copy-localization-boundaries",
    title: "全站中文化四批：标签与数据的界线、枚举映射单源，以及三个工具层硬坑",
    tags: ["文案中文化", "枚举映射", "CRLF", "this 绑定", "铁律对拍"],
    beforeDate: "2026-11-05T19:00:00.000Z",
    afterDate: "2026-11-06T10:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 「把所有英文改成中文」这句需求里藏着三条界线

截图圈出来的是 UI 展示层的硬编码英文，但同一屏上还站着另外两类东西：**系统专有术语**（BEFORE / AFTER 是详情页内容顺序与摘要口径的名字）与**用户自由输入的数据**（\`Log.tags\` 里的 \`archive · first-entry · validation\`）。

把三类一起翻译，会同时制造两种事故：筛选条显示中文而 URL 仍是 \`?tag=archive\` 的两套名字；以及给自由输入编一张永远不全的映射表。`,
    afterContent: `## 一、单源映射，未知值原样输出

新建 \`src/lib/labels.ts\`：\`kindLabel\` / \`statusLabel\` / \`logsCountLabel\`，键是库里的真实取值（\`product|tool|site\`、\`WIP|LIVE|ARCHIVED\`），未知值 \`?? 原值\` 原样露出——**不编造「未分类」来填补不确定性**。它必须住 \`src/lib\`：\`node --test\` 不读 tsconfig paths，\`@/\` 别名在测试里会炸，映射要能被纯逻辑测试覆盖（新增 4 组断言，测试数 73 → 77）。

下拉选项是另一条线：\`<option value>\` 保持英文原值（写库与 \`PROJECT_KINDS.includes()\` 校验口径不许动），只加一层 \`labelMap\` 显示中文。

## 二、横幅前缀去掉，而不是硬译

\`SAVED · 项目已保存\`、\`PUBLISHED · 已发布，前台可见\` 这类英文前缀与后面的中文句同义，硬译会变成「已保存 · 项目已保存」。处置是**去掉前缀**，中文句自解释；而 \`LOG_002\`、\`VAL_001\` 这些错误码是 \`errorCodeChip()\` 依赖的系统码，一个字都不能改。

## 三、术语永久保留的改口

我最初把 BEFORE / AFTER 列进要翻译的清单，助手照单执行了一半才报上来：这两个词是 SPEC F03 点名的内容顺序、D5 摘要口径的字段语义、说明书第 81 行的界面描述——翻译它们等于同时改需求词汇、代码语义和对外文档，收益只是「看起来全中文」。裁定改为**永久保留**，并顺手把 \`LESSON LEARNED\` 全局搜索清干净（详情页标题 + 两个后台表单标签），而 \`error-text.ts\` 里 \`lessonLearned\` 的提示本来就是中文，无需动。

## 四、三个工具层硬坑

**坑 A：CRLF 与 LF 混用。** 批量脚本用 \`"\\n"\` 拼的多行匹配模式，在 CRLF 检出的文件里永不命中，报「未命中」看着像文案根本不存在。同一仓库两种行尾并存——没被工具重写过的文件是 CRLF，被 Edit 或脚本重写过的变成 LF。处置：脚本先按文件自身探测行尾（\`s.includes("\\r\\n")\`）再拼模式，落笔前用 \`node -e\` 打印目标片段的 JSON 看真实字节。

**坑 B：摘方法丢 \`this\`。** \`const pad = " ".repeat; pad(4)\` 抛 \`TypeError: String.prototype.repeat called on null or undefined\`——方法一离开接收者就废。批量脚本里的短别名一律写成箭头函数 \`const pad = (n) => " ".repeat(n)\`，\`arr.join\`、\`s.split\` 同理。

**坑 C：半行 old_string 留残句。** 用 Edit 改中文长行时，\`old_string\` 只占半行会把后半句留下、前半句替换掉，形成一句谁都不认识的残句。改长行改用按行号 splice + 锚点断言的脚本，**落笔后数结构（div/section 开合计数）而不是看 diff**。

## 五、两条流程级收获

- 我引号里的「原句」在文件里不存在：我说「清理三处『首页不一致待点名』的过期记录」，实际措辞是「留给负责人的一条不一致」与「一条留待点名的不一致」。助手的处置是**先 grep 出清单报我逐条批**，而不是自己找一句最像的改——这条已固化成规矩。
- 铁律与实现冲突时改铁律，但要走授权：中文标签走 Inter 之后，「时间戳与标签强制 JetBrains Mono」这句就过期了，按点名把「字体」行改为「时间戳、数字与英文标识强制 JetBrains Mono；中文标签走 Inter（font-sans），并移除大写字母专用的宽字距」，历史留痕行不动。`,
    lessonLearned: `展示层不翻译用户数据、不改写库取值——翻译的边界是「这个词归谁所有」，不是「它是不是英文」。同理，文档里的数字与措辞一律当场重算重读，历史读数与引号原句都不能直接当当前事实用。`,
  },
  {
    slug: "unverified-means-unusable-upload-chain",
    title: "「未验证」原来是「不可用」：Blob 不是 File、自我判死的白名单、CORS 假阴性",
    tags: ["OSS 上传", "Server Action", "对象键", "magic bytes", "CORS"],
    beforeDate: "2026-11-04T09:00:00.000Z",
    afterDate: "2026-11-04T16:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 一句话我在十几份文档里写了「未验证」

图片上传的成功分支，我在 AGENTS.md、Phase-5b/6/7 自测表和上线手册里以「未验证」的名义写了十几遍。真去点一次的结果是：永远回 \`IMG_001 · 图片不合格：仅支持 jpg / png / webp / gif，且不超过 5MB。\`

它不是没验，是从 Phase 5b 起**一次也没成功过**。「未验证」这三个字在我这里是中性描述，但实际效果是把一条已知的坏路径伪装成了待办。`,
    afterContent: `## 三层根因，一层比一层深

**第一层排除**：先在 Node 里用同一份 \`sniffImage()\` 跑这张 PNG，返回 \`{ext:"png",mime:"image/png"}\`——类型判定是好的。如果我只信那句文案，就会一头扎进 magic bytes 里。剩下的三个 IMG_001 出口从页面上分不开，我在动作里临时把「形状数字」通过既有 \`code\` 字段带回页面（只带数字、不带文件内容、测完删掉），拿到 \`blob=70 ab=70 type=image/png\`。

**根因之一**：\`upload-action.ts\` 判的是 \`formData.get("file") instanceof File\`，而 Server Action 的参数跨 React 边界反序列化后落地的是 **Blob**。任何文件都被判成「类型不合法」。

**根因之二**：改判 Blob 之后仍然 IMG_001。看服务端日志里动作耗时从 7ms 变成 248ms（开始真走网络）才确认过了这关，回头查 \`oss.ts\` 里那句 \`!/^[a-z0-9./-]+$/.test(key)\`：对象名的时间戳来自 \`toISOString()\`，里面必然带大写 \`T\` 和 \`Z\`，而断言只允许小写——**它把自己生成的每一个键都判死**。

**根因之三（写回归测试时才现形）**：这条断言的白名单里 \`.\` 和 \`/\` 本来就在，\`logs/../etc/passwd\` 完全通过。注释里写的「排除目录穿越」此前是假的。现在改成逐段判：空段、\`.\`、\`..\` 全拒，并要求整体落在 \`logs/\` 前缀下，与 RAM 策略的 resources 限定对齐。

**结构处置**：把键的生成与断言从 \`oss.ts\` 拆成 \`src/lib/object-key.ts\`——留在原文件里就进不了 \`node --test\`（那会拉起 ali-oss），于是「生成器比断言宽松」这种矛盾只能靠人肉撞见。

## 端到端判据与一条方法

70 字节合法 PNG 两次上传都回 \`已上传 · 70 字节\`，直链 \`https://laity-archive.oss-cn-beijing.aliyuncs.com/logs/2026-11/20261104T112157Z-72fc4931e9ca.png\` 能作为图片加载（\`naturalWidth=1\`）。这里记一条方法：**直链跨域，\`fetch()\` 会被 CORS 挡（报 \`Failed to fetch\`），不能用 fetch 判可达性**，改用 \`<img>\` 的 \`onload/onerror\`。

配套纪律：图片类型只按文件内容签名（PNG / JPEG / GIF87a / GIF89a / RIFF…WEBP 的 magic bytes）判，不信浏览器上报的 MIME 与文件名；尺寸上限三处必须同步——SPEC 的 5MB、\`next.config.ts\` 的 6mb、nginx 的 6m，改小或漏改都算失效；桶里遗留的探针对象应用删不掉（AK 只有 \`oss:PutObject\`），这是刻意的最小权限，不为它扩权限反而降低安全性。`,
    lessonLearned: `凡是我有本地条件跑、却因为怕麻烦或怕副作用而没跑的，不写「未验证」，写「未跑，怀疑不可用」。真正被安全策略正当拦下的动作才标未实测，并且不换写法绕。`,
  },
  {
    slug: "product-skeleton-and-health-probe",
    title: "功能完备 ≠ 产品合格：站点骨架、健康判据与「能机器判的都别留给人」",
    tags: ["产品骨架", "健康检查", "CI", "可达性"],
    beforeDate: "2026-11-03T09:00:00.000Z",
    afterDate: "2026-11-03T16:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 三层谁都没做、也谁都没发现的缺口

Phase 1–5 功能齐了，我原以为剩下的就是部署。实测扒出三层不在任何 Phase 验收清单里的东西：

- **产品骨架层**：前台没有持久导航（\`/projects\` 只能手背 URL，这正是 I030 的根因）、全站只有一行 title/description、没有 \`robots.txt\` 与 \`sitemap.xml\`、详情页标题不跟随内容、键盘焦点没有可见样式；
- **上线基线层**：没有任何自动化测试、没有与登录无关的健康端点、未知路由落框架默认页、没有隐私说明与备案号位置；
- **机器判据层**：四道门禁全靠我本机手敲，忘了跑就是发版；材料窗口靠人估，估错一次就少交一整层实现。`,
    afterContent: `## 骨架按「访客能走到任意内容」判

持久导航 + 元信息 + 抓取规则 + 可达性一起补：\`SiteNav\` 三入口带 \`aria-current\`、正文容器 \`id="main"\` 配跳转链接、键盘焦点统一 \`outline: 2px solid\` 写在 \`globals.css\` 不允许组件自定、\`sitemap.xml\` 只收公开稳定路由、后台在 \`robots.txt\` 显式排除。

## 健康探针：一个恒返回 0 的探针比没有更坏

app 容器原本打 \`/login\`，返回 200 就算健康——可库完全连不上的时候 \`/login\` 照样 200。改成打 \`/api/health\` 并解析响应体，要求 \`db === true\` 才退出 0，\`start_period\` 给 30s，\`web\` 等 \`app\` healthy 再起。

探针表达式本身用桩服务器做了**五路自检**：真健康退 0，HTTP 503、返回 HTML、字段缺省、端口无人各退 1。

入口网关反而**故意不加探针**：80 端口直接 301，busybox wget 对重定向的判定不稳，与其装一个会误报健康的，不如没有。代价也写清楚：库抖动会把 app 标成 unhealthy，但 compose 不因 unhealthy 自动重启、\`depends_on\` 只在启动时把关，不会级联停摆。

## 拿不到的结论就不赌

为了决定 CI 要不要配数据库，我让本机停共享容器做实验，安全策略连拦三次（停共享容器、打印带口令的连接串各算一类），**没有换写法绕**。既然结论拿不到，就不要拿「赌」当设计依据：CI 直接配一次性 \`postgres:16\` 服务，\`prisma migrate deploy\` 与 \`npm ci\` 都跑在它上面——两种情况都成立，顺带把 I018 那类「Windows 安装把 linux 平台条目从锁文件剪掉」变成常驻防线。

CI 顺序与人工四道门禁完全一致，另加材料两步自检（生成 + \`git diff --exit-code\`）。这条判断的代价是当天多花两轮在窗口配平上，换来的是「漏登记就红、材料没同步就红」。`,
    lessonLearned: `容器健康与站点健康必须对上同一句话：进程活着不等于能取数。凡是「我记得要跑」的检查，最终都得变成机器判——人执行制度的可靠性远低于制度执行人。`,
  },
  {
    slug: "unowned-defects-credentials-limits-and-spec-gaps",
    title: "三不管缺陷：模板里的真凭据、框架 1MB 上限、SPEC 写了代码没有",
    tags: ["凭据泄漏", "Server Action", "bodySizeLimit", "规格对账"],
    beforeDate: "2026-11-02T18:00:00.000Z",
    afterDate: "2026-11-02T23:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 最要命的一条是我自己造成的

我照着助手给的「哪些文件需要换成真实值」清单去填，结果把真凭据填进了**被 git 跟踪的模板文件** \`.env.example\` 与 \`.env.production.example\`。而软著生成脚本的收录清单里正好有 \`.env.example\`——**只要我再跑一次生成，密钥就被印进要提交的 PDF 材料**。

运气成分是真实的：仓库历史是干净的（扫了 19 个 commit 的四个相关 blob，密钥键全是空），而 origin 落后三个 commit 没推出去，等于网络故障替我挡了一次事故。`,
    afterContent: `## 一、扫描器要先自证有效

清回空值之后，我没有直接相信「扫描无命中」这句话。第一版探针按物理行取文本，报出「长度 811」的假阳性；改成按 \`<div class="ln">\` 行节点取，再拿一行合成的假值做对照，**确认它抓得到非空值**，才敢承认这次「干净」成立。

## 二、SPEC 写着的能力，实际达不到

\`server-actions.md:83\` 明写 Server Action 请求体默认 **1MB**，而我这边 SPEC 与代码都按 ≤5MB 设计。也就是说：任何超过 1MB 的图在进 \`uploadImage()\` 之前就被框架拒了，**还不会映射成 IMG_001**。这条从 Phase 5b 第一天起就存在，lint / tsc / build / 镜像全部通过，没有人发现。

抬到 \`experimental.serverActions.bodySizeLimit: "6mb"\` 之后才对得上——我第一次把它写成顶层键，\`tsc\` 立刻报 TS2353 把我拽回来。

## 三、规格有、代码无、台账也没有

同一批翻出 \`unpublishLog\`：SPEC:117 定义得好好的，\`src/\` 里 grep 零命中，而且**之前一直没挂账**。这属于三不管地带，比挂账的坑更危险。

## 四、代理的话不能原样用

三条它说重了我没采纳：把 \`publishLog\` 判成「存证非原子」（实际三个字段写在同一条 UPDATE 里，剩下只是读-改-写竞态）；说 nginx 的 6m「无用」（抬升动作上限后它仍是第一道兜底）；它引的一句官方文档在我查的文件里**根本不存在**，我改查 \`instant.md\` 才拿到权威表述。

## 五、三个被工具当场抓住的自错

- 把「下架」表单插进 \`{!log.isPublished && (...)}\` 内部——锚点找的是「发布表单末尾」却没注意外层被条件包着，\`tsc\` 报 TS1005：**改 JSX 必须先看清外层括号的归属**；
- \`getArchiveBoard\` 排序后用解构丢字段，eslint 报 unused，改成显式重映射；
- 台账批量改状态列时多补一个竖线，四行从 6 列变 7 列——\`awk\` 数一遍列数才暴露，**markdown 表格坏在渲染前是看不见的**；
- \`taskkill\` 与查库串成一条命令被安全策略拦下，拆成两条就正常：链式命令里混一个高危动作，会把无害的验证一起拖死。`,
    lessonLearned: `「规格里写了但代码里没有」和「代码能跑但框架上限卡住」都属于没人负责的缺陷——前者靠 SPEC 与 grep 对账，后者靠读依赖框架的本地文档。两样都不能靠「跑起来了」当证据。`,
  },
  {
    slug: "install-is-a-destructive-action",
    title: "装依赖是破坏性动作：被剪掉的 @emnapi 边、build 红而 lint 绿、生产侧四键整段不存在",
    tags: ["lockfile", "ali-oss", "Turbopack", "serverExternalPackages", "环境变量"],
    beforeDate: "2026-11-02T09:00:00.000Z",
    afterDate: "2026-11-02T15:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 「只差装个依赖」这句话错了三处

Phase 5b 的代码是「故意不可编译」入库的——\`src/lib/oss.ts\` 引了还没装的 \`ali-oss\`。我以为把第 0 步的 \`npm install\` 跑完就能验，结果装依赖这一步本身带出三件谁都没预料到的事：

1. 装包动作把我十几天前刚修好的 lockfile 跨平台同步**又破坏了一次**；
2. 依赖装上了，构建反而是红的，而 lint 和类型检查全绿；
3. 生产那半套（变量模板 + 编排透传）根本不存在，而本机永远测不出来。`,
    afterContent: `## 一、平台边被剪

容器内 \`npm ci --dry-run\` 报 \`Missing: @emnapi/runtime@1.11.3 from lock file\`。根因：Windows 本机 \`npm install\` 按当前平台重算可选依赖，把只在 wasm32 路径上需要的 \`@emnapi/*\` 四条边从锁文件里剪掉；\`--omit=optional\` 救不了，因为**校验发生在解析之前**。

改 lockfile 属红线，所以先取证据再报：在 \`node:24-slim\` 容器里用 \`--package-lock-only\`（不装任何包）重算，逐条比出「条目 570→578、0 删除、0 版本变化、\`lockfileVersion\` 仍 3、resolved 仍是 npmmirror」，两侧各跑一次 \`npm ci --dry-run\` 都退 0 才动。中间还有一次自我纠正：先用 \`cmp\` 确认验证过程没把仓库里的原锁文件改掉。

## 二、lint/tsc 绿，build 红

构建报 \`./node_modules/urllib/lib/detect_proxy_agent.js:24:44 Module not found: Can't resolve 'proxy-agent'\`。\`urllib@2\` 用懒加载 \`require("proxy-agent")\`，这个包本就不在新增的 68 个包里（只有设了代理环境变量才真用到），而 Turbopack 静态解析这句 require 时找不到模块就判失败。

处置是 \`next.config.ts\` 加 \`serverExternalPackages: ["ali-oss"]\`。但改完不是「应该没问题」就交出去：本地产物里有 \`ali-oss\`（599K）、\`docker build --target runner\` 出图成功、镜像内 \`require("ali-oss")\` 与客户端实例化都通过、\`proxy-agent\` 缺席也不报错。**外部包 + standalone 是容易漏文件的组合，只验 build 不够。**

## 三、生产侧整段不存在

grep \`OSS\` 在 \`.env.production.example\`、\`docker-compose.prod.yml\`、\`Dockerfile\`、\`nginx.conf\` 里**零命中**——5b 只改了开发侧模板，而本机走 \`.env\` 直连，这个缺口在本机不可见。补齐时都用 \`\${VAR:?}\` 把失败提前到部署阶段。

这里还推翻了我自己一个说法：我原以为 preflight 会比 compose 插值更早失败，实测相反——把 \`OSS_REGION\` 置空后 \`docker compose up\` 直接退出 1，**一个容器都没起**。所以 preflight 那四条的价值是门禁清单自证与兜底，不是第一道防线，这句写进文件头免得后人当它是主门禁。`,
    lessonLearned: `本机装包本身就是破坏性动作，装完必须在 linux 容器重算锁文件。验收要分三层：静态检查绿 → 构建绿 → 产物内运行时绿，只到第一层就说「通过」，是把「没报错」当「能跑」。`,
  },
  {
    slug: "printed-pagination-and-window-arithmetic",
    title: "软著材料的分页真相：@page margin box 没人实现、中文按双宽折行、窗口按整页折算",
    tags: ["软著材料", "打印分页", "折行", "assertWindowFit"],
    beforeDate: "2026-10-30T22:00:00.000Z",
    afterDate: "2026-11-03T15:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 最省事的做法恰好没人支持

我原本打算用 CSS \`@page\` 的 margin box（\`@top-center\` 之类）生成页眉页码。去 MDN 一看：CSS Paged Media 的 margin box 相关属性**至今没有被任何 user agent 实现**，Chrome 只支持 \`@page\` 的 \`size\` 与 \`margin\`。要是没查这一条，交出来的材料会没有页码。

## 材料窗口的算术本来就错了

I034 是这一天里最难看的一条：50 个收录文件里有 **15 个不在提交页中**，而缺的偏偏是最能代表软件的那几个——\`src/app/page.tsx\`、\`SiteNav.tsx\`、\`Editor.tsx\`、\`StatusBoard.tsx\`、\`Seal.tsx\`、\`sitemap.ts\`、\`robots.ts\`。材料形式上仍符合「前 30 页 + 后 30 页」的通用作法，但审查员翻到的全是数据层与工具层。根因是我按「分段感觉」判断装得下。`,
    afterContent: `## 一、定页自绘

生成器改成每页一个固定 210×297mm 的块、\`page-break-after: always\`、页眉是块内第一行。浏览器实测 61 个页面块：尺寸 \`794×1123px\` 正好等于 210×297mm，\`overflowing: []\`。

## 二、折行按显示列，不按字符数

代码页必须 \`white-space: pre\` 才不会自动折行，这样「每页 50 行」才数得准；代价是超过页宽的行长就被切。实测最长行 226 字符、还有 37 行超 95 字符。更麻烦的是**中文要按双宽算**——一个汉字在等宽字体里占两个字符位，所以「95 字符」这种判断本身就不可靠。

改法：按显示列折行（宽字符计 2 列、上限 96 列），续行冠一个 \`↳\`，并在封面注明这个符号是排版产物、不属于源码。生成后实测最大列宽正好 96、超限行 0、折行 47 条。

说明书原先用 \`pre-wrap\`，长标题与长列表项没参与折行，结果是「我数出来一页 30 行，浏览器印出来可能是 34 行」——页数承诺直接失效。改成所有行统一按 92 列折行。92 这个数是算出来的：10.5pt 无衬线一个汉字约 3.7mm，可用宽度 182mm ≈ 49 个汉字 = 98 列，取 92 留余量。

## 三、窗口交给机器判

收录清单从扁平 \`ORDER\` 改成 \`BANDS\`（四段，③ 标 \`foldable\`），新增 \`assertWindowFit()\`：非折走段文件被窗口切断或整份掉进折走段就**拒绝出件**。

第一版判据自己就错过：按「前后各 1500 行」判，它通过了，而我拿生成的 HTML 反推才发现 \`globals.css\` 的头部被切掉。真实容量是**按整页折算**——后窗口取最后 30 个页块，末页只有 9 行也占一整页名额，所以是 1459 而不是 1500。

还有一行注释就能顶破窗口的实例：给 \`eslint.config.mjs\` 加三行注释（I039），①+② 从 1486 被顶到 1501，\`proxy.ts\` 又被切掉一行。

## 四、自检脚本自己也翻过车

「收录完整性自检」第一次运行就报 \`收录清单里有磁盘上不存在的文件：next.config.ts\`，看着像清单写错，实际是**校验逻辑本身的 bug**：拿只包含 src/prisma 的磁盘清单去比根目录的配置文件。教训：自动检查第一次跑出的「违规」，先怀疑检查本身。

另有一处措辞 bug：后段页眉原本写「原文档第 N 页**起**」，但 N 是逐页算的，只有第 31 页配得上「起」字，第 60 页写成「第 68 页起」就是假话 → 改成「本页为原文档第 N 页」。`,
    lessonLearned: `自研工具自报的结论不能直接采信，要从产物反推再核一遍；窗口容量按整页折算，跨页边界是非线性的。任何「页数 / 行数」的承诺，都必须由能在浏览器里量到的几何数字背书。`,
  },
  {
    slug: "evidence-atomicity-save-then-publish",
    title: "存证的原子性：口径在有历史数据之前定死、发布先存再发、被拒的提交不许吃掉正文",
    tags: ["存证", "SHA-256", "先存再发", "sessionStorage", "会话判定"],
    beforeDate: "2026-10-30T13:00:00.000Z",
    afterDate: "2026-11-04T11:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 三件事串成一条链

第一件：防伪哈希的口径如果等写代码时随手定，等库里有了历史数据就再也改不动——改一次就等于和历史印章全部不兼容。

第二件：发布动作原本是「直接发布」，用户点了按钮，页面显示的内容与盖戳的内容可能不是同一份。

第三件：正文写到一半被服务端校验打回，页面带着错误参数回来时从库里重渲染，**写到一半的字整段没了**；而更糟的是「清 dirty 标记」这个动作恰好把丢稿拦截解除武装了。`,
    afterContent: `## 一、口径前置定死

D5：\`sha256(title + "\\n" + beforeContent + "\\n" + (afterContent ?? ""))\`，UTF-8，小写十六进制。唯一实现是 \`src/lib/content-hash.ts\`——运行时、种子脚本、任何复核工具都必须复用它，不允许第二处重算。为了让 seed 与运行时共用这一份，专门开了 \`allowImportingTsExtensions\`（D15）。

复核是双跑的：首次发布 \`6fa39af8…\`，用 node 从库里三个字段按 D5 现算，与库里 \`contentHash\` 完全一致；改标题重新发布变成 \`b4f50884…\`，再算一次还是一致，\`publishedAt\` 从 \`08:07:41Z\` 变到 \`08:09:32Z\`。UTC 也顺手验了：界面显示 16:07、库里 \`08:07Z\`，正好差 8 小时。

## 二、先存再发（D25）

发布改成「保存并发布」挂在同一张表单上：先落库、再算哈希与服务器时间，**所见必须等于所发**。已发布日志被保存即退回草稿（D9），旧哈希与旧时间保留作「上次发布」；摘要缺失时前台显示「摘要缺失」告警块而不是静默省略印章——存证是核心功能，静默降级比报错更有害。措辞技术中性，不自称存证、不可篡改或权属凭证。

## 三、被拒的提交不许吃掉正文（D26）

表单提交那一刻把两份正文暂存进 \`sessionStorage\`，页面带 \`?error=\` 回来时一次性回填并立即清除；任一表单提交（保存、发布、下架、彻底删除都算）先清掉 dirty 标记，所以不会出现「刚点了保存还被浏览器问要不要离开」。短字段（标题、标识、标签）按设计不回填——它们本身就是出错那一项，需要重填。暂存不落服务器、不进数据库，关闭标签页即消失。

## 四、会话与限速

会话判定三处（Proxy 前置守卫、后台布局、每个 Server Action）**共用同一个入口** \`requireAdminSession()\`——「存在会话」不构成放行理由。\`session.maxAge\` 从 v4 默认的 30 天显式收到 12 小时，因为后台只有一把口令、JWT 会话没有服务端吊销，笔记本被人拿到就等于白送一个月管理员权限；**不加「记住我」**，那等于把 30 天请回来。

限速两层不许绕开再造第三套：生产 nginx 对 \`/api/auth/callback/admin\` 的 \`limit_req\`（rate=5r/m、burst=5，超限直接 429、请求不进应用），与应用层节流（10 分钟窗口内同来源 5 次失败即不再建立会话，表现与「口令不正确」完全一致）。应用层计数的来源键取 \`X-Forwarded-For\` 首跳，这一跳可信是因为 nginx 在边缘**用 \`$remote_addr\` 覆写**该头（不是 append）。`,
    lessonLearned: `口径类决策属于「现在不想清楚、以后没法补救」，必须在有历史数据之前定死并由唯一实现承载；任何「我点了保存却被拦下」的路径都要按丢稿来设计——正确性之外，用户的手感就是数据完整性的前线。`,
  },
  {
    slug: "proxy-preflight-real-404-under-ppr",
    title: "Cache Components 的静态壳：真 404 只能由 Proxy 前置判定",
    tags: ["Next 16", "Cache Components", "Proxy", "真 404", "no-store"],
    beforeDate: "2026-10-30T10:00:00.000Z",
    afterDate: "2026-10-30T21:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 我写下的一条错误结论

Phase 2 时我在自测表里写：「\`export const instant = false\` 把该段标记为允许阻塞，先查完再决定输出，\`notFound()\` 就发生在流式之前」。听起来很自洽。

实际验证：\`curl -w %{http_code}\` 打一条不存在的 slug，得到 **200**，正文首行是 \`<html id="__next_error__">\`。对照组 \`/logs/*\` 有 Proxy 前置判定的那条才是 404。

## 两处语义误读

- \`instant = false\` 的真实含义是**退出即时导航校验**，不是「把这条路由改成动态」——我们的注释描述错了整整一轮，用法倒是碰巧对的；
- \`searchParams\` 放在页面函数顶层 \`await\` 会直接把静态壳打掉，构建立刻报 \`encountered uncached or runtime data during prerendering\`。`,
    afterContent: `## 三组探针，不靠猜

到底哪种写法能保住状态码，我做了对照实验：

1. Proxy 里 \`NextResponse.rewrite(url, { status: 404 })\` → 实测 **200**：\`rewrite()\` 会把 init 摊进响应，但被重写路由自己的状态码盖掉；
2. 直接 \`new NextResponse(html, { status: 404 })\` → **404**，状态码和正文都在；
3. 页面级 \`notFound()\` → 200 + 404 内容，因为流式响应的状态码在正文开始流之前就已发出。

定案：新增 \`src/proxy.ts\`，matcher 先圈 \`/logs/:slug\`，后按 D7 同一路数扩到 \`/projects/:slug\`；未命中直接返回纸白极简 404 页，带 \`x-robots-tag: noindex\` 与 \`cache-control: no-store\`——**日志发布后同一个 URL 必须立刻能回到 200，不能让 CDN 缓存住这一次 404**。

## 顺手补的三条纪律

- 请求里的 slug **一律不拼进 HTML**，文案抽成 \`NOT_FOUND_COPY.log / .project\` 两个常量对象，\`readSlug\` 改成带前缀的 \`readSegment(pathname, prefix)\`；
- 两条判定各查各的：日志查「是否已发布」，项目查「slug 是否存在」；只有草稿的项目详情页仍返回 200 且正文是空态（项目本身公开），而它的草稿日志 404；
- 函数末尾留一条「matcher 被改宽就放行」的兜底——拿不准的分支，误拦比误放危险；
- \`searchParams\` 的 Promise 传进 Suspense 子组件里再 await，壳保住、筛选照样从 URL 取。

回归九条路由一次跑齐：\`/\` 200、\`/logs\` 200、\`/logs/<存在>\` 200、\`/logs/<不存在>\` 404、\`/projects\` 200（matcher 不含列表页）、\`/projects/<存在>\` 200、\`/projects/earth%2Dmirror\` 200（\`decodeURIComponent\` 生效）、\`/projects/<不存在>\` 404、\`/admin\` 307。`,
    lessonLearned: `流式响应一旦开始流，状态码就改不了了——「在页面里再判一次」永远救不了 HTTP 语义。框架版本的行为差异只能读 node_modules 里的当版文档并做对照探针来定，凭训练记忆写出的结论会连注释一起骗人。`,
  },
  {
    slug: "five-layer-defense-institution-over-trust",
    title: "五层防线不是文档，是把「错误决策被默认通过」变成制度成本",
    tags: ["工作法", "门禁", "事实基座", "可证伪验收"],
    beforeDate: "2026-10-30T09:00:00.000Z",
    afterDate: "2026-10-30T18:00:00.000Z",
    publishedAt: "2026-11-06T05:37:58.763Z",
    beforeContent: `## 三种翻车，一个根因

用编程助手这段时间，事故不外乎三种：擅自换掉我定好的技术栈、我说一句「帮我做个 XX」它替我做了二十个隐含决策（权限模型、分页策略、错误码格式全是它定的，至少五个跟我要的不一样）、以及它说「已完成、测试通过」而我一跑就崩。

往深挖是三个根因：**它不知道**（每次会话失忆，不给项目事实就拿通用最佳实践填空）、**目标模糊**（需求没边界它就自由发挥）、**验收主观**（「质量良好」没法证伪，它说过关就过关）。

## 我最初的错误认知

我以为这是提示词工程问题——「写得好一点就乖了」。实际是把质量押在运气上。还有一个更隐蔽的错判：我以为需求说清楚就够了，没意识到**跑偏最贵的不是写错代码，而是错误决策被默认通过**。`,
    afterContent: `## 用制度替代信任

把它当一个执行力很强但每天失忆的初级工程师来管，管理靠制度：

- **事实基座**：AGENTS.md 每次自动加载，技术栈、环境实况、红线、验收命令全部写成能被 grep 检查的形式；
- **三道确认门禁**：需求 → 规格 → 方案，每道必须停下等我，不许滑过去；
- **阶段闭环**：Phase 1 必须是贯穿前后端与数据库的最小纵向闭环，我否掉了横切分层（先全部实体、再全部服务、再全部页面），因为那种拆法把联调风险全推到最后一刻；
- **验收门禁**：验收标准写成「可执行命令 + 预期输出」，出现「稳定 / 健壮 / 良好」打回重写；并且**换一个会话做独立验收**——同一会话里助手倾向于维护自己先前的输出；
- **过程存证**：docs 下分研发日志、测试记录、功能截图、软著材料四个证据目录，每个源文件顶部手写文件头注释，每天记指令原文与踩坑。

配套的硬约束还有两条：每个 Phase 列出允许触碰的文件清单（用 \`git diff --stat\` 机械核查，比「只做登录模块」这种自然语言硬得多），单 Phase 不超过 15 个文件。

## 一条反直觉结论

助手**修错的过程比修对的结果更有证据价值**——那些「现象 → 我判断根因 → 修正」的记录恰恰证明人在主导判断和取舍。所以踩坑不许删，照实记。`,
    lessonLearned: `禁令比鼓励有效十倍：「禁止引入新依赖」是可以机械检查的，「尽量用现有技术」只会被自由发挥。规范的写法决定它会不会被执行——验收标准写不出来的功能，往往就是执行者自己也没想清楚的功能，这时候该拆需求，不是硬写。`,
  },
  {
    slug: "archive-itself-as-first-entry",
    title: "把档案库本身当成第一条真实入库数据，顺便验穿写路径",
    tags: ["archive", "first-entry", "validation"],
    beforeDate: "2026-11-04T10:58:00.000Z",
    afterDate: null,
    publishedAt: "2026-11-06T02:18:21.195Z",
    beforeContent: `BEFORE 判断（2026-11-04）：本地库里的演示数据被我清空后，档案库里一条记录都没有，前台只剩空列表。我原先打算重新跑一次 prisma db seed 把旧的示例日志灌回去——那最快，但那是一条假数据，演示不了发布链路，也会让前台印章下的内容与真实研发过程无关。\r
![favicon.jpg](https://laity-archive.oss-cn-beijing.aliyuncs.com/logs/2026-11/20261106T021737Z-f5a5c58639fc.jpg)`,
    afterContent: `AFTER 验证（2026-11-04）：改成以本项目自己作为第一条真实记录。项目选 Laity 项目档案库（slug laity-archive），正文写这次入库决定本身。全程从后台表单走：新建项目 → 保存草稿 → 保存并发布 → 前台详情读摘要。结果：项目与日志都落库，发布动作先存后发、摘要按当前正文计算；顺带在这条路径上撞出一个真缺陷——REPO URL 的 pattern 属性里反斜杠成了两个，合法的 https 地址被浏览器静默拒收，表单不提交也不报错（I060），修成与正则同源之后一次通过。`,
    lessonLearned: `经验：假数据只能证明程序在跑，证明不了程序在做对的事。第一条真实数据还顺带量出一个静默失效——声明式校验不加控制台核对就等于没加。`,
  },
];

async function main() {
  // V2.0 多租户：先建用户再建档案。复合唯一 @@unique([userId, slug]) 下
  // where: { slug } 不再是合法唯一键，所有 upsert 改走 userId_slug 复合键（负责人 Step 2 任务 1）
  const user = await prisma.user.upsert({
    where: { handle: "zhanglei" },
    create: {
      handle: "zhanglei",
      email: "zhanglei@example.com",
      name: "张磊",
      isAdmin: true,
    },
    update: {},
  });

  const created = await prisma.project.upsert({
    where: { userId_slug: { userId: user.id, slug: PROJECT.slug } },
    update: {},
    create: { ...PROJECT, userId: user.id },
  });

  for (const log of LOGS) {
    await prisma.log.upsert({
      where: { userId_slug: { userId: user.id, slug: log.slug } },
      update: {},
      create: {
        slug: log.slug,
        title: log.title,
        projectId: created.id,
        userId: user.id,
        tags: log.tags,
        beforeContent: log.beforeContent,
        afterContent: log.afterContent,
        lessonLearned: log.lessonLearned,
        beforeDate: new Date(log.beforeDate),
        afterDate: log.afterDate ? new Date(log.afterDate) : null,
        isPublished: true,
        publishedAt: new Date(log.publishedAt),
        // D5 摘要口径的唯一实现：这里只调用，不复制第二份算法
        contentHash: computeContentHash(
          log.title,
          log.beforeContent,
          log.afterContent,
        ),
      },
    });
  }

  console.log(
    `seed 完成：用户 ${user.id}（handle ${user.handle}）下 1 个 Project，${LOGS.length} 条已发布 Log`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
