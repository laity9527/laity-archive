# 项目事实（AI 必读，违反即返工）

项目：Laity 项目档案库（个人全栈数字档案库：厂牌官网 + 开发复盘证据链）
负责人：张磊
本文件维护人：张磊（AI 不得自行修改本文件；发现事实过期，停下来向我报告）
修订留痕：2026-11-03 由 AI 按我点名"根据你的经验补充 AGENTS.md"补写环境实况、上传与合规事实、
四道门禁与软著材料生成铁律；2026-11-04 由 AI 按我点名"1044 可改"更新三处过期事实——
登录行（GitHub OAuth + 白名单 → 管理员口令，理由与代价见 DESIGN.md 的 D20）、环境实况里"真实上传联调"的前置、
preflight 门禁清单的最后一项；同日再按我点名"I049、I050 可以改，根据你的经验改"更新登录行末尾的
"三处会话判定"（统一到 `requireAdminSession()`）并新增"登录限速两层"一条（见 DESIGN D21/D22）；
除此之外 AI 仍不得自改本文件。
修订留痕续：2026-11-05 由 AI 按我点名"根据你的经验及相关文件继续修改"新增四节——
文档体系与阅读顺序、常见变更操作手册、已知坑速查、术语表；纯增量，未改动任何既有事实行。
修订留痕续二：2026-11-05 由 AI 按我点名"根据你的经验及之前的回答和相关优化设计重新给出五份文档"，
新增两节——环境变量总表、开工与交付自检清单；视觉铁律节末尾追加一条"待裁决"记录（外部设计方案的建议
色值 vs 本文件实测值）。纯增量，未改动任何既有事实行。
修订留痕续三：2026-11-05 由 AI 按我点名"视觉令牌是否切换 根据你的经验判断；新增 /about 关于页"，
在视觉铁律节"待裁决"条后追加"已裁决"裁定（裁定切换 `#f4f1ec` 令牌体系，附依据、三步执行协议与"待实施"标注），
并在"新增一个页面"手册追加"已裁决待实施"一条（新增 `/about` 关于页，P1）。两处均为增量，既有实测值在实施完成前仍然有效。
修订留痕续四：2026-11-05 由 AI 按我点名"重写 README、增量修改 AGENTS（文档体系表新增 README 行、
已知坑速查新增文档数据过期一行）、清理 ISSUES、修正 archive README"，在「文档体系与阅读顺序」表
**新增优先级 0 的 README.md 行**（角色=项目入口，冲突判定不高于事实基座，故排在"代码与运行时实测"之后、
本文件之前是给新人读的顺序而非冲突判定顺序），同节首句"另外三份"随之改为"另外四份"（一个词的一致性修正，
是我这次改动直接造成的，非范围外顺手改）；在「已知坑速查」表末尾新增一行"文档数据与代码实际不符"
（处置=每次发版前用 `npm test` 等实际输出核对文档数字，来源 I071 / D32）。**两处均为纯增量，
未改动任何既有事实行、未改技术选型与视觉铁律。**
修订留痕续五：2026-11-05 由 AI 按我点名"第 1 项：修改 globals.css 把主背景色从 #FBFBF9 切换为 #f4f1ec，
并同步修正 AGENTS.md 视觉铁律里的色值定义"，在视觉铁律「色彩」行把背景实测值改为 **`#f4f1ec`** 并写明
其余三项本轮未切换、`--paper-2` 已废弃、纸白单一来源为 `--background`；同节「已裁决」块的实施状态由
"待实施"改为**"部分实施"**并注明焦点框仍用 `#131313`。配套代码改动只有一处色值（`globals.css` 两个令牌 +
`src/proxy.ts` 的 404 内联页背景，后者按铁律追加了文件头修改记录行）。**业务逻辑、数据模型、matcher、
字体、形态铁律均未改动**；技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）未改动。
修订留痕续六：2026-11-05 由 AI 按我点名"F19/D31 状态同步——这正是兑现刚立的'文档数字必须与实测对拍'防线"，
把「新增一个页面」手册第 5 条由"已裁决待实施"改记为**实测结果**：`/about` 已实施、路由 `○`（静态生成）、
进导航第三项与 sitemap，并写入两条实测修正（`routes.ts` 黑名单制下不需改、`SiteFooter` 未改）
与一条新增经验（新页吃窗口容量，`assertWindowFit()` 第七次拦下出件，先预留容量）。同轮 D30 剩余令牌的
对比度与落点方案另存 `docs/00-开发方法论/D30-剩余令牌切换方案.md`（**待批准，本文件未因此改动任何色值**，
现行色彩口径仍是续五记下的那一组）。纯增量，未改动任何既有事实行。
修订留痕续七：2026-11-05 由 AI 按我点名"D30 方案批准，A 阶段逐步执行；本轮只做 A1"，
把主墨由 `#131313` 切到 **`#1a1a18`**：`--foreground` 改值、`--color-ink` 与 `:focus-visible` 的 outline
**由字面量改为引用 `var(--foreground)`**（我点名的漂移点——两个令牌同一颜色、焦点框第三处字面量，
一并消掉），`src/proxy.ts` 的 404 内联样式同步三处主墨（body 文字、链接文字、`a:hover` 下边框）。
「色彩」行、「焦点可见性」行与「已裁决」块的实施状态按实测改记；`--paper-2` 废弃、hairline 豁免、
不引入 `--ink-2` 与数据色、`--rule-strong` 不用于按钮边框四条裁定一并写入。
**故意不在 A1 改的两处**：`globals.css:94` 的 `var(--color-ink-soft, #5c5c5c)` 回退字面量与
`proxy.ts` 里的 `#5C5C5C`/`#E7E7E2`——它们属 A2/A3，现在改会让"回退值 ≠ 令牌值"，正是要防的那类不一致。
A2–A4 未做，B1 待 A 阶段走完再执行。技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）未改动。
修订留痕续八：2026-11-05 由 AI 按我点名"A2：只改 `--color-ink-soft`，并把回退字面量整个去掉；本轮两条新增指令
——把'折排版不折逻辑'写进软著材料铁律、把'等行替换被误判为不动行数'写进已知坑速查"，做了三件事：
① **A2 落地**：`--color-ink-soft` `#5c5c5c` → **`#625d53`**、`blockquote` 的
`var(--color-ink-soft, #5c5c5c)` 去掉回退值改为 `var(--color-ink-soft)`（去之前先实测产物 CSS 确认
`@theme inline` 会输出真实变量，不是只做内联替换，否则去掉回退值会静默失效）、`src/proxy.ts` 两处
`#5C5C5C` 同步；②「已知坑速查」末新增一行"等行替换被误判为不动行数"（来源 I034-补2 复发、A1 第八次拦出件）；
③「软著材料生成铁律」新增一条常驻判据"**让位者按'折排版不折逻辑'选，不按行数最少机械挑；
判断依据是 SPEC 是否点名了该文件的形态**"，并注明机器建议是默认路径、被点名"先报后动"时以点名为准。
「色彩」行随之改记：仅剩极细线 `#E7E7E2` 未切（A3），并把"改令牌必须同步改 `proxy.ts` 三组字面量"
写成唯一手工同步点。A3/A4/B1 仍未做；技术选型未动。
修订留痕续九：2026-11-05 由 AI 按我点名"A3 批准，但 `proxy.ts` 那处 `#E7E7E2` 必须与 `globals.css` 的
`--color-hairline` 在同一 commit 内改完；实算加一句 I073 豁免说明；层间区分度 2.66 记入 A4 验收项、A3 不动它"，
完成 **A3**：`--color-hairline` `#e7e7e2` → **`#d9d2c5`**、`src/proxy.ts` 的 404 内联页 `a` 下边框同批同步（同一条 commit），
文件头只加 1 行修改记录以控材料窗口压力；实算 `#d9d2c5/#f4f1ec` = **1.33:1**，并按我要求附一句
"I073 已裁定装饰性分隔线豁免 3:1；本处实算仅作留档，不作为验收门槛"。
「色彩」行改记四色全部到位（不再有"待切换的旧值"），Proxy 手工同步点由三组扩为四组；
「已裁决」块实施状态改为 A 阶段色值已切完，并把**层间区分度的浏览器实测判据与"只 revert A2 单步"的回退预案**
指向方案文档的「A4 验收补项」——A3 本身不动它。A4/B1 仍未做；技术选型未动。
修订留痕续十：2026-11-05 由 AI 按我点名"A4 批准，起 dev 做层间区分度实测；判据不通过就只挂 ISSUES 给我裁定，
不要在同一条 commit 里既改文档又改代码"，完成 **A4**：起 dev（标准输出写 `D:\tmp\laity-dev.log`，守 I048）
用应用内浏览器读 hydrated DOM，扫三页的 `color × font-size` 分组——**辅助灰在 16px 及以上只有首页 hero
一段（18px），其同容器正文是 36px 标题；日志详情页与 `/about` 的"同字号只靠颜色分级"用例数为 0**，
故现有内容判据**通过**，未改色值、未 `git revert` A2。唯一未覆盖的潜在场景 `.log-body blockquote`
（18px 宋体 + 辅助灰，与正文同字号同字族）当前无内容触发，已按指令挂 **I075 OPEN** 等裁定。
「已裁决」块实施状态改为**已实施**（A 阶段四色 + A4 实测，余 B1），色彩行的四值口径维持 A3 后的表述不变、
无需再改（本轮没有新的色值改动，如实记录这一点）。同轮同步 DESIGN D30 状态与「A4 实测结果」段、
SPEC C2 与第九节、README 快照、方案文档进度；材料重出并核对两次 MD5。**本轮 commit 只含文档与材料，
不含任何 `.ts`/`.tsx`/`.css` 改动。**
修订留痕续十一：2026-11-05 由 AI 按我点名"I075 保持 OPEN 只改写处置栏（三条理由 + 复测触发条件），
然后执行 B1，独立 commit"，做了两件事：① **I075 处置栏改写**（负责人裁定理由：`blockquote` 已有
`border-left` 非颜色线索、争议实际是 1px 够不够显眼；没有内容可测就改边框等于凭感觉改代码；
复测条件为"第一条含 blockquote 的日志发布时立即复测，不通过再考虑加粗到 3px 或改斜体，未发布前不预先调整"），
我"只靠颜色分级"的说法偏严已在该条内记录，**A4 在其它四份文档里的记录按我的指令未改动**；
② **D30 B1 落地**：`globals.css` 新增 `--color-brown #7a5a3a`（全站唯一强调色，带注释限定用途），
`SiteNav.tsx` 当前项改 `border-brown text-brown`，非当前项辅助灰与 `aria-current` 逻辑未动，
文件头加 1 行记录。实测 hydrated DOM：当前项 `rgb(122,90,58)`（文字与下边框同色）、非当前项
`rgb(98,93,83)`、`aria-current="page"` 仍 1 处、页背景 `rgb(244,241,236)`。
「色彩」行随之加入强调色条目并把"不引入"范围收窄到 `--ink-2`/数据色；「已裁决」块实施状态改 D30 闭环。
**一条留给我的不一致**：首页当前态由字标承担仍是主墨，棕色只在其余三页出现，改不改需我点名。
门禁 lint/tsc/test/build 全 0（73 pass）、材料生成器未被拒（6614 行 / 133 页 / 整份可见 25）。
修订留痕续十二：2026-11-05 由我点名"D30 文档收口——三处过期记录同步、措辞校正、I075 备注并提，本轮只改文档"，
做了三件事：① 「已裁决」块里"留给负责人的一条不一致"（首页「当前态」由字标承担、仍是主墨、待点名）
按 **B1 补**的实际结果改记为**已统一**（字标首页态下划线走 `border-brown`、文字保持 `text-ink`，
任何时刻全站只有一个元素带棕色下划线），DESIGN D30 与 `docs/00-开发方法论/D30-剩余令牌切换方案.md`
的同源记录同步；② A4 记录里描述 `blockquote` 场景的"只剩/只靠颜色分级"三处（本文件、DESIGN、方案文档）
按我裁定改记为"争议点是 **1px 竖线是否够显眼**"——**我在 I075 裁断栏里的逐字引用、`/about` 用例计数句、
以及上面续十/续十一两条留痕的历史文字均未改动**；③ README 状态快照删掉过期子句"首页当前态仍用主墨（待点名）"
并补记 B1 已实施。本文件「已裁决」块之外的色值口径未动（仍是续九后的四值 + 强调色）。
**本轮 commit 只含 .md 与 ISSUES 的 I075 备注，不含任何 `.ts`/`.tsx`/`.css` 改动、未重出软著材料。**
本轮 amend 追加：D30 小节标题、D31 实施确认、路线图引言三处过期表述一并改为已闭环（原 commit `cc8f3ca`，本次 amend 以替换该条生效，故最终哈希以 `git log -1` 为准）。
修订留痕续十三：2026-11-06 由我点名"AGENTS.md 视觉铁律「字体」行，授权修改"——**本轮按负责人授权，更新视觉铁律字体行，
同步中文标签的字体策略**。起因是 `f2eb2d8` 与 `12940c1` 两轮把界面英文标签改成中文后，原句"时间戳与标签强制 JetBrains Mono"
与实现不符（中文标签已走 Inter）。改动只有那一句，按我给的口径替换为"时间戳、数字与英文标识（如 BEFORE/AFTER）强制
JetBrains Mono；中文标签走 Inter（font-sans），并移除大写字母专用的宽字距（tracking-[0.2em]）"；
同节的色彩、形态、图标、版式与焦点可见性各行均未改动，技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）未改动。
修订留痕续十四：2026-11-06 由我点名"把 CRLF/LF 混用与摘方法丢 this 这两条新增到「已知坑速查」表末尾，并在修订留痕里追加一句"——
本文件**只在「已知坑速查」表末新增两行**（工作区 CRLF 与 LF 混用、摘方法丢 `this`），其余事实行一字未动。
同轮代码改动属"三批与第四批去英文"的收尾：`src/app/projects/[slug]/page.tsx` 的 SINCE/REPO/LOGS 三处展示标签改中文，
`src/proxy.ts` 的 404 内联页 `404 · NOT FOUND` 改 `404 · 页面未找到`（守卫逻辑、matcher 与四组色值字面量未动）；
文档侧经全局搜索确认 SPEC/说明书引用的 404 文案是 `copy.title`/`heading`（`404 · 日志不存在`、`404 · 项目不存在`），
与被改的 `.label` 行无关，故无需同步。
修订留痕续十五：2026-11-10 由我点名"文档口径收口（解决 I077）"——**授权修改本文件**，把 V2.0 四轮改造
（4-A 恢复 GitHub OAuth、4-B 按 userId 隔离、Step 5 加密落库与同步）的事实同步进事实基座。改动四处：
①「技术栈锁定」的登录行整段重写——Credentials/ADMIN_PASSWORD → GitHub OAuth + `userId` 判据、
`githubAccessToken` 加密落库、`public_repo` scope，并标注 `ADMIN_PASSWORD`/`ALLOWED_GITHUB_IDS`/`admin-password.ts`
已退役；②同节「登录限速」由两层（nginx + 应用内节流）改为**单层 nginx**，端点改
`/api/auth/callback/github`；③「环境变量总表」删 `ADMIN_PASSWORD` 行、补 `GITHUB_ID`/`GITHUB_SECRET`/
`ENCRYPTION_KEY` 三行，并把"已废弃勿再用"由 GITHUB 两键改回 ADMIN_PASSWORD（GITHUB 两键**不是**废弃项）；
④本节本身。**未改**：视觉铁律、数据与存证约定、合规红线、验证命令、软著材料铁律、目录约定与其余各节。
修订留痕续十六：2026-11-10 由我点名"Step 6 Commit 1 环境变量与 compose 配置"——**授权修改本文件**，「环境变量
总表」补 `AI_API_KEY`（必须，preflight 硬卡，缺了部署阶段失败）/ `AI_API_BASE_URL`（可选，缺省回落
DashScope 兼容端点 `https://dashscope.aliyuncs.com/compatible-mode/v1`）/ `AI_MODEL_NAME`（可选，缺省
回落 `qwen-plus`）三行；其余各节一字未动（登录行、限速层、数据与存证约定、合规红线、验证命令、软著材料
铁律、目录约定均未改）。同轮另改：换Docker 编排"preflight 硬卡 AI_API_KEY 非空"与"app 环境块补三键透传"，
以及两份 .env*.example 补同名前缀键，全部分条如实汇报见当轮留痕。
修订留痕续十七：2026-11-12 由我点名"Commit 2 高亮接线与视觉落地"——**按上一轮裁断①的授权修改本文件**，
「视觉铁律」色彩行里 `--brown` 的用途描述由"目前只给持久导航的当前项（文字 + 1px 下边框）用"改记为
"用于持久导航的当前项（文字 + 1px 下边框）与搜索高亮底色（F24，A 案棕底纸白字，2026-11-12 裁断①授权扩权）"；
配套代码改动：`globals.css` 新增 `mark` 规则（显式覆盖浏览器默认黄底，`line-height: inherit` 保行高）并同步
`--color-brown` 令牌自身注释。色值、对比度判据、其余各行与技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）
均未改动；历史留痕块（D30 B1 / B1 补）按留痕铁律不改写。
修订留痕续十八：2026-11-12 由我点名"在 AGENTS.md「已知坑速查」追加一条"——**按点名授权修改本文件**，
本文件**只在「已知坑速查」表末新增一行**（分页边界效应：改动收录清单内文件触发 meta 总行数变化 + 分页位移 +
边界行进出提交页，材料重出验收标准为「无丢失、无重复、新增行合法」而非「零增删」）。其余事实行、修订留痕块
与技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动。
修订留痕续十九：2026-11-13 由我点名"Commit 10c 分页边界效应文档收口"——**按点名授权修改本文件**，
只改述「已知坑速查」的「分页边界效应」一行（保留原事实，追加 A1+B+C2 现状：margin=163 行、
生成器阈值 `BOUNDARY_MARGIN=100`、余量低于阈值或切口行非法（空行 / ↳ 续行 / 文件分隔行）直接拒件、
封面边界签名变化即位移信号）。其余事实行、修订留痕块与技术选型
（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动。
修订留痕续二十：2026-11-13 由我点名"检查项目代码与相关文档，给出可执行优化建议并落实到文档"——**本轮按点名授权修改本文件**，
只改述「环境实况」里"真实上传联调"的前置句：删去 D20 时代口径"2026-11-04 起不再依赖 GitHub 授权，口令是我自己配的"，
改为"需我本人用 GitHub 账号登录后台后亲自点一次上传；V2.0 Step 4-A 起登录恢复为 GitHub OAuth，
口令方案随 D33 退役，AI 侧没有我的 GitHub 会话"。其余事实行、修订留痕块与技术选型
（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动；同轮新增
`docs/00-开发方法论/优化建议-2026-11-13.md`（代码与文档体检清单，含本轮红线突破记录）。
修订留痕续二十一：2026-11-13 由我点名"同步 AGENTS 分页边界效应行的过时数值"——**按点名授权修改本文件**，
只改述「已知坑速查」的「分页边界效应」一行里的两处写死数值：`margin=163 行` 改为「margin 随总行数在
115–163 之间波动，结构性最低 115（高于阈值 100）」，`后窗口第 9201 行起于 forms.ts` 改为「后窗口起点与
切口文件随总行数变化，以封面边界签名为准，不写死」。A1+B+C2、阈值 100、三类非法切口拒件、封面签名即
位移信号与三项核对标准均保留；其余事实行、修订留痕块与技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动。
修订留痕续二十二：2026-11-13 由我点名“O8 性能预算写进验证命令”——**按点名授权修改本文件**，
只在「验证命令（验收唯一依据）」节「软著材料」命令之后追加三条可核对的性能预算
（`/logs` 首屏查询数 ≤2 且响应不含正文字段；任一前台页面 Prisma 查询数 ≤3，不含 Proxy 前置判定；
`/sitemap.xml` 查询数 ≤3，与用户数无关），每条附核对方式；其余事实行、修订留痕块与
技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动。
修订留痕续二十三：2026-11-13 由我点名“先做 A”+“授权改 AGENTS”——**按点名授权修改本文件**，
只改「视觉铁律」的「版式」一行：默认最大宽仍为 1080px，补记首页与日志大厅（连同站点导航、页脚）
放宽到 **1200px**，并注明日志详情仍是 1080px 外框 + 720px 正文；色值、字体、形态、图标、焦点各行
与技术选型（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）一字未动。同轮代码改动：修 StatusBoard
项目链接 404（新增 `publicProjectHref()` 单源）、关于页两处口令文案改 GitHub OAuth、导航中文
10px → 12px、首页加馆藏条与精选编号；未改数据模型、鉴权链路与写路径。

修订留痕续二十四：2026-11-13 由我点名“授权改 AGENTS 临时登录行”+“提交验收记录”——**按点名授权修改本文件**，
只在「技术栈锁定」登录行追加“临时本地登录（仅开发、env 控制、生产不注册、恢复后删除）”一段；
GitHub OAuth 主线、ADMIN_PASSWORD 废弃结论、会话判定、登录限速、环境变量总表、视觉铁律与技术选型
（Next 16.4.3 / Prisma 6.19.3 / Tailwind 4.3.3）均未改动。同轮提交最终验收记录；后台截图与 connection() 修复已在
`e19f6cc`，临时登录在 `c4504a1`，材料重出在 `5487607`。

---

## 技术栈锁定（不可替换，不建议升级）

- 前端/全栈：Next.js（App Router）+ TypeScript
- 样式：Tailwind CSS（禁止引入其他 UI 组件库、CSS 框架、图标库）
- ORM：Prisma（provider 固定为 postgresql）
- 数据库：PostgreSQL 16（Docker 容器，库名 laity）
- 登录：NextAuth.js v4.24.15，提供方为**框架内置 GitHub OAuth**（V2.0 Step 4-A 恢复，取代 D20 的
  ADMIN_PASSWORD 口令方案；决策见 DESIGN 的 D33）。OAuth 回调地址为 `<NEXTAUTH_URL>/api/auth/callback/github`，
  scope 为 `read:user user:email public_repo`（public_repo 供 Step 5 同步读取公开仓库 commits）。
  首次登录在 jwt 回调里按 githubId → handle → 新建 认领/建号，并把 `account.access_token` 经
  `src/lib/token-crypto.ts` 的 AES-256-GCM 加密后写入 `User.githubAccessToken`（token 不进 JWT/session）。
  登录页自建在 `/login`（I012-B）。**已废弃勿再用**：`ADMIN_PASSWORD`、`ALLOWED_GITHUB_IDS`、
  `src/lib/admin-password.ts`——随 D33 一并退役，见到别加回。
  **临时本地登录（2026-11-13 负责人授权，仅开发）**：当 `NODE_ENV !== "production"` 且 `.env` 配置
  `DEV_LOGIN_PASSWORD` 时，`src/auth.ts` 额外注册 `dev-admin` Credentials provider；用户名默认 `admin`
  （`DEV_LOGIN_USER` 可覆盖），密码只从环境变量读取、源码不写死，登录解析到真实 `zhanglei` 用户的 `userId`。
  生产构建不注册；GitHub OAuth 恢复稳定后须删除该 provider、`src/lib/dev-login.ts`、`src/components/DevLoginForm.tsx`
  与两个环境变量，并重出软著材料。**该临时入口不是 `ADMIN_PASSWORD` 的复活**，上面的废弃结论不变。
  会话判定共三处且**共用同一个入口** `requireAdminSession()`（定义在 `src/auth.ts`）：`src/proxy.ts` 前置守卫
  （matcher 覆盖 `/admin/:path*`，判 `token.userId` 为非空字符串）、`src/app/admin/layout.tsx`、各 Server Action
  （不依赖前端隐藏按钮）。布局与动作判的是 `session` 回调带出的 `userId`——"存在会话"本身不构成放行理由；
  数据读写另在 DAL 层强制 `userId` 复合条件（0 行即资源不存在）。`isAdmin` 字段保留在库但不再参与任何判定。
  `src/proxy.ts` 不得 import `src/auth.ts`：会话判定要保持轻量，不该把整个鉴权栈拉进前置守卫
- 登录限速：生产 `deploy/nginx.conf` 对 **`/api/auth/callback/github`** 的 `limit_req`
  （rate=5r/m、burst=5，超限由代理直接 429、请求不进应用）。应用层的 admin-password 进程内节流
  随 D33 退役，**不要再造一套应用层失败计数**；来源地址由 nginx 在边缘**用 `$remote_addr` 覆写**
  `X-Forwarded-For`（不是 append），客户端伪造的第一跳不会被采信
- 包管理：npm（禁止 pnpm/yarn/bun）

### 版本事实（最高优先级）

- 本项目使用的 Next.js 版本与旧版（如 14）存在 breaking changes：API、约定、
  文件结构都可能不同。**写任何 Next.js 代码前，必须先读
  node_modules/next/dist/docs/ 下的对应指南，禁止凭训练记忆使用旧 API。**
- 实测版本（2026-11-03 从 node_modules 读取，不是声明值）：Next.js 16.4.3、React 19.3.0、
  next-auth 4.24.15、Prisma 6.19.3、Tailwind CSS 4.3.3（@tailwindcss/turbopack）、TypeScript 5.9.3、
  ali-oss 6.23.0。本机 Node v24.13.0 + npm 11.6.2。
- Next 16 的两个既成事实，写页面时必须按它来：`cacheComponents: true` + `partialPrefetching`
  （页面默认按 PPR 出静态壳，请求期数据靠 `connection()`），路由段配置 `instant` 的语义是
  "退出即时导航校验"，不是把路由改成动态。
- 依赖已装齐（此前"本地无 node_modules"的降级期已结束）。凡是"未验证"的表述都要注明缺哪一步。
- `next dev` 会自动向本文件写入版本警告块。该块被重新生成属于正常现象，
  不要从 diff 中删除它；连同你的改动一起提交即可。

## 环境实况（方案必须适配，不许假设理想环境）

- 本机现状（2026-11-03）：Node/npm 已装，`node_modules` 就绪，Docker Desktop + 本地
  PostgreSQL 16 容器（`laity-postgres`，库名 laity，口令为仅限本地的 root/root，见 I001）。
- 仍缺的：服务器上的生产编排实跑、真实上传联调（需我本人用 GitHub 账号登录后台后亲自点一次上传；
  V2.0 Step 4-A 起登录恢复为 GitHub OAuth，口令方案随 D33 退役，AI 侧没有我的 GitHub 会话）、
  `docs/03-功能截图` 的运行截图。这几项 AI 一律标注"未验证"，不得用推断补全。
- GitHub 仓库：https://github.com/laity9527/laity-archive
- 提交与推送由我本人执行。AI 可以提交，但只有我明确说"提交"才算授权，说提交不等于说 push。
- npm 走本机镜像源（npmmirror），其 `security` 端点未实现，所以 `npm audit` 必报错——
  这不是代码问题；真要审计得临时指官方源，属环境改动，需我批准。

### Windows + Git Bash 三个已踩过的坑

- MSYS 会把容器内路径改写成宿主盘符：`docker ... -w /w` 变成 `W:/`、`openssl -subj /CN=` 也被吞。
  带 `MSYS_NO_PATHCONV=1` 前缀执行。
- Node 眼里的 `/tmp` 是 `D:\tmp`，不是 Git Bash 的那个 `/tmp`。临时产物一律写仓库内 `tmp/`
  （已 gitignore，且已排除出 lint，见 I039）。
- 管道接 `| head` 会让退出码变成 SIGPIPE 的假红。要判成败就 `> 文件` 再读，别把命令串在管道尾上取 `$?`。

## 目录与命名约定

```
laity-archive/
├── AGENTS.md                # 本文件：事实基座
├── .github/workflows/       # 发版门禁的自动执行（改它需批准）
├── deploy/                  # nginx 配置与证书挂载位
├── docs/
│   ├── 00-开发方法论/       # 工作法、决策记录、上线与回滚手册
│   ├── 01-研发日志/         # 每日：指令原文、思考、踩坑（现象→根因→修复）
│   ├── 02-测试记录/         # 功能自测表、待验证清单
│   ├── 03-功能截图/         # 真实运行截图（必须带地址栏）
│   └── 04-软著材料/         # 源程序文档、操作说明书（md 是源，HTML 是产物）
├── prisma/
│   ├── schema.prisma        # 数据模型（Project / Log）
│   ├── migrations/          # 迁移只由 prisma migrate 生成，不手改、不对库直接执行
│   └── seed.ts              # 种子；哈希口径必须复用 src/lib/content-hash.ts
├── src/
│   ├── app/                 # 页面路由（App Router）+ api/health + privacy + not-found + error
│   ├── components/          # 核心组件（导航、页脚、时间轴、印章、看板）
│   └── lib/                 # 工具函数（Prisma 实例、哈希、存证、上传、鉴权、站点标识）
├── tests/                   # node --test 用例，只测纯逻辑
├── tools/                   # 软著材料生成器（收录清单与窗口判据在这里）
└── docker-compose.yml       # 本地 PostgreSQL 容器（生产另用 docker-compose.prod.yml）
```

- 页面放 src/app/<路由>/page.tsx；可复用组件放 src/components/；
  数据访问与工具函数放 src/lib/，页面内禁止直接 new PrismaClient。
- 过程性文档一律进 docs/ 对应子目录，不许散落根目录。

## 视觉铁律（精确值，违反即返工）

- 色彩：**背景 `#f4f1ec`（暖纸，D30）** / **主字 `#1a1a18`（暖墨，D30 A1）** /
  **辅助字 `#625d53`（暖灰，D30 A2，同时移除了 `blockquote` 里的回退字面量）** /
  **极细线 `#d9d2c5`（暖线，D30 A3，对齐 D30 映射表的 `--rule`）**。
  四色已全部走完暖调，无遗留旧值。**唯一强调色 `--brown #7a5a3a`（D30 B1 引入）**，
  用于持久导航的当前项（文字 + 1px 下边框）与搜索高亮底色（F24，A 案棕底纸白字，
  2026-11-12 裁断①授权扩权），非文本对比实算 5.56:1（≥3:1）；
  不进按钮、边框或正文。`--ink-2`/数据色按 `docs/00-开发方法论/D30-剩余令牌切换方案.md`
  的裁定**不引入**（无承载物），`--rule-strong` **不用于按钮边框**（1.91:1 不达组件边界 3:1），
  草稿的 `--paper-2 #efeae1` 已废弃（I072 WONTFIX），1px 分隔线按装饰性豁免 3:1（I073，
  实算 1.33:1 仅留档不作门槛）。
  **单一来源（改这里就改全局，别再写第二处字面量）**：纸白 = `src/app/globals.css` 的 `--background`
  （`--color-paper` 引用它）；主墨 = `--foreground`（`--color-ink` 与 `:focus-visible` 的 outline 都引用它）；
  辅助灰 = `--color-ink-soft`（A2 起 `blockquote` 直接引用，不再有 `#5c5c5c` 回退值——
  已实测产物里 `--color-ink-soft:#625d53` 与 `color:var(--color-ink-soft)` 都成立，`@theme inline` 确实会输出真实变量）。
  **唯一仍必须手工同步的地方是 `src/proxy.ts`**：404 页是拼出来的内联 HTML，拿不到 CSS 变量，
  改任何令牌都要在**同一个 commit** 里同步它的四组字面量（背景 / 主墨 / 辅助灰 / 分隔线），
  漏改就是"改了 A 忘了 B"——A3 就是把 `--color-hairline` 与它的 `#E7E7E2` 绑在同一批落地的。
- 形态：border-radius: 0（全局零圆角）；box-shadow: none（无阴影）；无渐变
- 字体：UI 用 Inter；日志正文强制 Noto Serif SC（思源宋体，18px / 行高 1.85）；
  时间戳、数字与英文标识（如 BEFORE/AFTER）强制 JetBrains Mono；中文标签走 Inter（font-sans），并移除大写字母专用的宽字距（tracking-[0.2em]）
- 图标：禁用一切图标库，只允许字符（↗ ← ● ○）
- 版式：内容最大宽 1080px；**首页与日志大厅（连同站点导航、页脚）1200px**（2026-11-13 显著升级 A）；
  日志详情限宽 720px（外框仍 1080px）；
  日志列表左侧 200px BEFORE/AFTER 时间轴（1px 竖线贯穿）
- 焦点可见性：键盘焦点统一 `outline: 2px solid var(--foreground); outline-offset: 2px`（即主墨 `#1a1a18`，写在 globals.css 的
  `:focus-visible`；A1 起引用令牌而非字面量，改主墨色时焦点框自动跟随），不允许各组件自定焦点样式；
  跳转链接 `#main` 与 `aria-current="page"` 属既有约定
- 自查方式：交付前 grep 自己的产出，出现 rounded-（非 rounded-none）、
  shadow-（非 shadow-none）、bg-gradient、图标库 import 即自行返工
- **待裁决（2026-11-05）**：外部《Laity 数字档案库 · 最终优化设计方案》与配套原型 HTML 建议把纸白改成
  `#f4f1ec` 一组新令牌（`--paper/#f4f1ec`、`--ink/#1a1a18`、`--ink-2/#45423b`、`--ink-3/#625d53`、
  `--brown/#7a5a3a`、`--rule/#d9d2c5`、`--rule-strong/#b9b0a0`、`--red/#a03a33`），与本文件实测值不同。
  本文件数值来自已上线代码实测，且 D21 的对比度判据（最差 6.45:1）基于现数值算得；换令牌等于全站视觉变更，
  并牵动软著材料里的设计令牌代码，属"锁定项"改动。**在获我点名授权之前一律以本文件实测值为准，不得按
  外部设计稿的色值改代码**；真要走，按"先出全站色值替换清单 + 对比度重算 + 重出软著材料"一条来。
- **已裁决（2026-11-05，负责人点名"视觉令牌是否切换 根据你的经验判断"）**：裁定**切换**到 `#f4f1ec` 令牌体系。
  依据：①语义化 10 项令牌（paper/ink/ink-2/ink-3/brown/rule/rule-strong 及数据色）优于零散 4 项灰阶，后续加色有位置可放；
  ②《优化设计方案》《整合设计方案》与配套原型 HTML 三份独立产物一致收敛于 `#f4f1ec`，设计意图明确，现行 `#FBFBF9` 更像早期实现漂移；
  ③暖纸色更贴合"纸质档案馆"隐喻，18px 宋体 / 行高 1.85 的长文更耐看；
  ④全站对比度重算后，新体系最差文本对比 5.56:1（`--brown` 链接与编号）/ 辅助字 `--ink-3` 5.81:1，均 ≥ WCAG AA 4.5:1；
  现行体系最差 6.45:1。两者同属"AA 达标、未达 AAA 7:1"一档，**切换不改变合规档位**。
  **执行协议（三步，缺一不可）**：①出全站色值替换清单（旧→新一一对应，映射表见 DESIGN.md 的 D30）；
  ②重算对比度判据并更新 DESIGN 的 D21 与 SPEC 验收基线；③重出软著材料（说明书内令牌代码与截图随之更新）。
  **实施状态：已实施（2026-11-05，A1–A4 全部落地 + B1 完成，D30 至此闭环）**——按负责人"逐步执行、每步一 commit"的节奏：
  纸白 `#f4f1ec`、主墨 `#1a1a18`（A1，含焦点框与 Proxy 三处）、辅助灰 `#625d53`（A2，含移除回退字面量与
  Proxy 两处）、极细线 `#d9d2c5`（A3，与 Proxy 的 `#E7E7E2` 绑同一 commit）均已实测生效；
  **A4 已完成层间区分度的浏览器实测**（详见 DESIGN D30「A4 实测结果」）：在日志详情页、首页、`/about`
  三页扫描所有直接承载文本的元素，**辅助灰在 16px 及以上的落点只有首页 hero 简介一段（18px），
  而同容器里的正文是 36px 标题——字号始终同向变化，没有任何一处层次要靠 2.66:1 的颜色差单独承担**；
  结论是**现有内容通过**，唯一未实测的潜在场景是 `.log-body blockquote`（样式上 18px 且继承辅助灰，
  与正文同字号同字族，真出现引用块时的争议点是 1px 竖线是否够显眼），当前唯一已发布日志里没有 blockquote，
  故该场景**挂 I075 等裁定**，A4 不擅自改色值也不擅自 `git revert` A2。
  余下 **B1 也已落地（2026-11-05，独立 commit）**：`globals.css` 新增 `--color-brown #7a5a3a`，
  `SiteNav` 当前项由主墨改 `border-brown text-brown`；浏览器 hydrated DOM 实测——当前项（`/about`）
  文字与下边框均为 `rgb(122,90,58)`、非当前项仍为 `rgb(98,93,83)`（边框透明）、`aria-current="page"`
  全站仍只有 1 处。**已统一（B1 补，独立 commit `a9aba42`）**：首页的「当前态」由字标 LAITY 承担，
  其下划线走 `border-brown`、文字保持 `text-ink`，与其余三页的导航当前项同色——任何时刻全站只有一个元素带棕色下划线。
  两级文字区分度实算 2.78:1 → **2.66:1**（旧 `#5c5c5c`/`#131313` → 新 `#625d53`/`#1a1a18`）；
  若将来内容触发 blockquote 场景且判定不够分，回退方案是**只 `git revert` A2 单步**（预案见方案文档
  「A4 验收补项」），不跨步调整。
  **焦点框特别约定**：焦点样式沿用 `--ink`（`#1a1a18`）以保持最强可视性；若按设计稿改用 `--brown`，须确认非文本对比 ≥3:1（实测 `#f4f1ec` vs `#7a5a3a` = 5.56:1，满足）。


## 数据与存证约定

- Log 模型关键字段：beforeContent / afterContent（Markdown）、
  beforeDate / afterDate（双时间戳）、isPublished（默认 false，草稿隔离）、
  contentHash（发布时 SHA-256）、publishedAt（服务器时间）
- 发布动作必须同时：计算正文 SHA-256 写入 contentHash、记录服务器时间，
  两者缺一不可
- 摘要口径（D5，改动即与历史印章不兼容，禁止"顺手规范一下"）：
  `sha256(title + "\n" + beforeContent + "\n" + (afterContent ?? ""))`，UTF-8，小写十六进制。
  唯一实现是 `src/lib/content-hash.ts`——运行时、种子脚本、任何复核工具都必须复用它，
  不允许第二处重算。详情页印章与库中 contentHash 不一致时前台显示"存证缺失"告警，不静默隐藏。
- 已发布日志被保存即退回草稿（D9）：旧 contentHash / publishedAt 保留作"上次发布"历史，
  重新发布按当前正文重算并刷新时间。"下架"只翻 isPublished，保留历史摘要与发布时间、正文不动。
- 时间一律存 UTC，展示层再做时区转换，禁止存本地时间字符串

## 合规与安全红线

- 依赖许可：MIT / Apache / BSD 可用；GPL / AGPL 传染性许可一律禁止，引入前必查
- 字体只用开源许可（SIL OFL / Apache 2.0）：Inter、Noto Serif SC、JetBrains Mono
- 图片素材只用免版权图库（Unsplash / Pexels），避让人脸与商标
- 前台数据访问只能走 src/lib 的 getSafeLogs() 类封装（内部强制 isPublished: true），
  禁止页面直接查询 Log 表
- Markdown 渲染必过 rehype-sanitize（防 XSS），禁止 dangerouslySetInnerHTML 裸渲染
- 上传图片禁止落服务器本地，通过 Server Action 转发阿里云 OSS 返回外链
- 图片类型只按**文件内容签名**（PNG/JPEG/GIF87a/GIF89a/RIFF…WEBP 的 magic bytes）判定，
  不信任浏览器上报的 MIME 与文件名；伪造 `image/png` 的可执行文件、文件头不完整一律 IMG_001。
  对象名由服务端生成（`logs/<YYYY-MM>/<UTC 时间戳>-<12hex>.<ext>`），不使用上传文件名。
- 尺寸上限三处必须同步改：SPEC IMG_001 的 5MB、`next.config.ts` 的
  `experimental.serverActions.bodySizeLimit: "6mb"`、`deploy/nginx.conf` 的 `client_max_body_size 6m`。
  框架默认动作体上限是 1MB，会把大图先拒在动作之外且**不给 IMG_001**——改小或漏改都算失效。
- `OSS_REGION` 必须是 `oss-cn-beijing` 这种带 `oss-` 前缀的地域 ID；写成 `cn-beijing`
  会拼出不存在的域名，上传成功但直链 404。RAM 子账号只授 `oss:PutObject` 且资源限定
  `acs:oss:*:*:laity-archive/logs/*`，与代码里硬编码的 `logs/` 前缀一致。
- ICP 备案号走 `SITE_ICP` 环境变量，只在服务端读取、以 prop 传给客户端页脚；未设置就不渲染该行，
  禁止硬凑文案。站点对外标识（域名、站名、描述）唯一来源是 `src/lib/site.ts`，别处不再写死域名。
- 数据库口令：本地开发容器的弱口令仅限本地；生产一律 `${VAR:?}` 从环境变量注入，禁止写进仓库。
  生产编排另有一次性 preflight 容器硬卡：用户名/口令非 root、口令≠用户名、长度 ≥12、
  域名是 https 正式域名、会话密钥 ≥32 位、后台口令非空且 ≥12 位、OSS 四键非空。
- 凭据留痕与验证口径：外部动作（AK 轮换、口令重置）只在文档里记状态
  （"已于 x 月 x 日轮换、旧密钥已删除"），**不记任何值**。AI 需要核实密钥时，
  只报键名与派生判定（是否存在、值长度、是否等于模板值），不回显值本身，也不写进任何产物；
  真实 `.env` / `.env.production` 由我本人填写与维护，AI 不把它当配置来源去读、更不复述其内容。
  产出物（尤其软著材料）交付前必须逐行扫描凭据形态，且先用注入的伪凭据验证扫描器有效再采信。

## 通用红线（任何 Phase 都不得触碰）

- 不得修改 build 配置、CI 配置、lockfile。现有的实体是 `next.config.ts`、`.github/workflows/ci.yml`
  与 `package-lock.json`；确需改动，停下列出理由与影响面等我批准，逐条批不算一批。
- `next.config.ts` 里的 `serverExternalPackages: ["ali-oss"]` 不是可有可无的优化：urllib 懒加载
  `require('proxy-agent')`，Turbopack 静态解析这句就把构建打红了（I022）。删掉它等于删掉构建。
- 凡在本机跑过 `npm install` / `npm update`，必须再在 linux 容器里重算锁文件
  （Windows 安装会静默删掉 linux 平台的 `@emnapi/*` 条目，I018 已复发过一次）。
  CI 的 `npm ci` 跑在 ubuntu 上，就是这条的常驻防线。
- 一次性诊断脚本只写 `tmp/`（已 gitignore、不参与 lint），用完可留可删，不许散落仓库根或 docs/。
- 不得顺手重构本任务范围外的代码；范围外问题记 ISSUES.md，不动手
- 不得新增依赖；确需新增，停下列出理由（含许可证）等我批准
- 数据库变更只改 prisma/schema.prisma 并生成迁移文件，不得直接对库执行
- 每个 Phase 只做该 Phase；禁止"顺便"提前实现后续 Phase

## 文件头注释铁律（软著留痕，优先级高于"少写注释"的通用习惯）

每个手写或经我要求修改的 .ts / .tsx 文件，顶部必须有：

```tsx
/**
 * 文件：[文件名]
 * 描述：[组件或函数的具体作用]
 * 作者：张磊
 * 创建日期：2026-xx-xx
 * 修改记录：
 * - 2026-xx-xx: [本次改动一句话]
 */
```

修改已有文件时追加修改记录行，不许覆盖历史记录。

## 验证命令（验收唯一依据）

四道门禁全 0 才算可发版，`.github/workflows/ci.yml` 在每次 push 与 pull request 上按同一顺序代跑，
AI 不得用"看起来没问题"替代任何一条的实际输出：

- 安装：`npm ci`（不是 install——锁文件必须原样生效）
- 数据库：`docker compose up -d`（postgres:16，端口 5432，库名 laity）
- 开发：`npm run dev`（访问 http://localhost:3000）
- 检查：`npm run lint`
- 类型：`npx tsc --noEmit`
- 构建：`npm run build`
- 测试：`npm test`（= `node --test "tests/*.test.ts"`，Node 自带 test runner，零测试依赖）
- Prisma：`npx prisma migrate dev`（迁移）/ `npx prisma migrate deploy`（全新库应用）/ `npx prisma studio`（查库）
- 生产编排校验：`docker compose --env-file tmp/<哑值文件> -f docker-compose.prod.yml config`
  （变量插值与 healthcheck 渲染核对；真实值只在服务器上）
- 软著材料：`node tools/软著材料生成.mjs`（收录完整性 + 窗口适配，见下一节）
- 性能预算（可数、可 grep，不用“响应时间 <200ms”这类不可核对的指标）：
  - `/logs` 首屏查询数 — **≤ 2**（`getLogFacets` 1 次 + `getLogList`/`searchLogsLimited` 1 次）— 核对：
    dev 里给 Prisma Client 挂 `$on("query")` 计数（或取 `pg_stat_statements` 请求前后差值），
    并 grep 响应 HTML 确认不含 `beforeContent`/`afterContent`。
  - 任一前台页面的 Prisma 查询数 — **≤ 3**（不含 `src/proxy.ts` 的前置判定）— 核对：同上计数中间件，
    逐页刷新一次记数。
  - `/sitemap.xml` 查询数 — **≤ 3**（与用户数无关；O5 后固定三条批量查询）— 核对：同上计数；
    新增用户后复测仍为 3。

覆盖边界要如实说：`npm test` 只锁纯逻辑（摘要口径、图片内容签名、slug 与表单取值、错误码文案、
时间展示、路由归属）。数据库层、需登录的 Server Action、页面渲染都不在其内，那部分靠
docs/02-测试记录/ 的自测表与人工联调，不能用测试全绿代替。

## 软著材料生成铁律（出件质量，违反即返工）

- 命令：`node tools/软著材料生成.mjs`，产物是 `docs/04-软著材料/` 下两份定页 HTML。
  代码每页 50 行、说明书每页 30 行；总页数超过 60 时只提交**前 30 页 + 后 30 页**。
- Chrome 不支持 CSS `@page` 的 margin box，所以页眉页码由脚本自绘。打印设置：A4 / 边距"无" /
  缩放 100% / 关闭浏览器页眉页脚。**浏览器打印成 PDF 的真实分页尚未实测（I021）。**
- 收录清单是 `tools/` 脚本里的 `BANDS` 数据结构，四段：①数据模型与配置、②核心逻辑、③折走段、
  ④站点外壳与访客界面。`assertComplete()` 保证 `src/` 与 `prisma/` 下没有文件被漏登记。
- 窗口容量**按整页折算，不是固定 1500 行**：后窗口取最后 30 个页块，末页只有 9 行也占一个名额。
  ①②④ 段的文件必须整份落在某个窗口内，被切口打断或整段落进省略段时
  `assertWindowFit()` 直接拒绝出件——任何一次普通改动（哪怕只加两行注释）都可能顶破窗口，
  所以这条判据不能靠人估，也不要绕过它。
- **让位者怎么选（常驻判据，2026-11-05 由负责人点名固化）**：被 `assertWindowFit()` 拒出件、需要在 ④ 段挑文件
  平移进折走段时，**按"折排版不折逻辑"选，不按行数最少机械挑；判断依据是 SPEC 是否点名了该文件的形态。**
  先看它承载的是不是需求里明确点名的界面形态——`Timeline.tsx` 是 SPEC F02 点名的 Before/After 时间轴，不折；
  再看它的逻辑是否已在别处整份可见——`StatusBoard.tsx` 只是把 ② 段 `projects.ts:getArchiveBoard()` 的结果
  排版成行，可折。先例：第八次拦出件时选了 67 行的 `StatusBoard.tsx`，而没选行数更少的 62 行 `Timeline.tsx`。
  另注：机器建议是默认路径，负责人可在具体一步上要求"先报后动"（A2 即明确要求先看清被切的文件与行范围再定），
  **被点名时以点名为准**。
- 生成必须逐字节幂等。改了任何收录文件或 `软件操作说明书.md` 都必须重出两份 HTML 并一起提交，
  CI 用 `git diff --exit-code -- docs/04-软著材料` 卡这一条。
- 材料里禁止出现任何真实凭据。自检脚本要先用注入的伪凭据验证扫描器有效，再采信"未见凭据"的结论。

## 文档体系与阅读顺序

本文件与另外四份根文档构成闭环。冲突按下表判定，发现冲突点一律回报、不私自动手抹平：

| 优先级 | 来源 | 角色 | 何时读 |
|---|---|---|---|
| 0 | README.md | **项目入口**：定位、当前状态快照、启动步骤、文档导读顺序。第一次接触本仓库先读它；但它的**冲突判定不高于事实基座**——与 AGENTS/SPEC/DESIGN 不一致时以那三份为准并回报 | 新人上手、对外介绍、找启动命令时 |
| 1 | 代码与运行时实测 | 唯一事实 | 与任何文档冲突时以现实为准 |
| 2 | 本文件（AGENTS.md） | 事实基座：技术栈、环境、红线、验收命令 | 每次开工前必读 |
| 3 | SPEC.md | 需求规格：做什么、做到什么算数 | 改功能前后 |
| 4 | DESIGN.md | 架构决策与路线图：为什么这样做、分几步做 | 涉及结构或取舍时 |
| 5 | ISSUES.md | 范围外问题台账：发现但不动手的事 | 遇到疑似历史遗留问题时先查 |

- 编号即坐标：`F##` 是需求（SPEC）、`D##` 是决策（DESIGN）、`I###` 是问题（ISSUES）、`Phase #` 是阶段（DESIGN）。引用一律带编号，不写"那个某某功能"。
- 三份下游文档互相引用：SPEC 引 AGENTS 与 D 编号；DESIGN 引 SPEC 的 F 编号与 AGENTS；ISSUES 回指 D 编号。改了需求或决策的编号等于重命名，需点名授权。
- 每次只改与本轮任务直接相关的那几行，不做"顺手统一措辞"；范围外的成文问题记 ISSUES，不动手。

## 常见变更操作手册（改一处，跟着改哪里）

单人项目最易出的错不是写不对，是**改漏了配套点**。下列清单照做，做完逐项打勾；清单随项目演化，新增一类变更就在这里加一节。

### 新增一个数据库字段
1. 只改 `prisma/schema.prisma`，再 `npx prisma migrate dev --name <意图>` 生成迁移；不直接对库执行 SQL。
2. 字段若要出现在访客可见范围，更新 `src/lib/projects.ts` / `src/lib/logs.ts` 的显式 `select` 白名单（D10：公开口径由查询层说了算，不靠 `include` 全量返回）。
3. 字段若影响摘要口径，改 `src/lib/content-hash.ts`（唯一实现）——口径变更即与历史印章不兼容，禁止"顺手规范一下"（D5）。
4. 表单要采集就改 `src/lib/forms.ts` 的 `LIMITS` 与 `parseInput`，并在 `src/lib/error-text.ts` 补该字段文案。
5. 补一条纯逻辑测试进 `tests/`，跑四道门禁。
6. 若该文件在软著收录清单内，重出材料（见下）。

### 新增一个页面
1. 页面放 `src/app/<路由>/page.tsx`；取数一律经 `src/lib/`，页面内禁止 `new PrismaClient()`。
2. 访客可见页面必须齐备：正文容器 `id="main"`、持久导航高亮 `aria-current`、`generateMetadata` 给 `title`/`description`。
3. 是否进 sitemap：只收公开稳定路由，改 `src/lib/sitemap-data.ts`；后台等例外路由在 `robots.txt` 显式排除。
4. 新文件若进收录清单会吃软著材料窗口容量——改完立刻跑 `node tools/软著材料生成.mjs`，看 `assertWindowFit()` 是否放行。
5. **已实施（2026-11-05，本行按原约定改记实测结果）**：前台"关于"页 `/about` 已落地——
   **路由 `○ /about`（静态生成），进导航第三项与 sitemap**，页脚入口沿用既有合规位规矩。
   三段内容齐备（个人简介 / 技术栈 / 联系方式），`id="main"`、`aria-current`、`generateMetadata` 三项实测通过
   （浏览器 hydrated DOM：仅「关于」项带 `aria-current="page"`；未配置邮箱时「待补充」以斜体渲染，页面 `mailto` 数 0）。
   两条实测修正原清单：① `src/lib/routes.ts` **不需要改**——它按 `/admin`、`/login` 黑名单判定，`/about` 天然为公开路由；
   ② `SiteFooter` 也未改（页脚本就不含导航项，"页脚给入口"由既有的隐私/许可入口承担）。
   新增页面确实吃了材料窗口容量：`about/page.tsx` 让 ④ 涨 155 行，`assertWindowFit()` 第七次拒绝出件，
   按其建议把 `not-found.tsx` 自 ④ 平移进折走段 ③ 后放行——**新增前台页要先预留窗口容量**。
   实施细节与判据见 DESIGN 的 D31「实施确认」。

### 新增一个 Server Action
1. 动作第一行必须是 `requireAdminSession()`（三处判定共用入口，D21）；"存在会话"不等于放行。
2. 参数先过 `parseInput`，失败回 `redirect(?error=VAL_001&field=<字段>)`；结果统一走 URL 参数，可截图留证（D14）。
3. 来自 URL 的 id 拼进回跳地址前必须过 `ID_PATTERN`；`projectId` 之类外键先校验存在性，别让 P2025 变 500（D26）。
4. 新错误码写进 `src/lib/error-text.ts`，后台横幅经 `errorCodeChip()` 过滤——未知码不打成标签（D28）。

### 新增一个环境变量
1. 三处同步：应用读取点、`.env.example`、`.env.production.example`。
2. 生产要能进容器：在 `docker-compose.prod.yml` 的 `app.environment` 里显式列出——`--env-file` 只参与插值、不注入容器（I024 踩过）。判断"未配置是否合法"：合法用 `${VAR:-}`，必须配置用 `${VAR:?}` 并进 preflight。
3. 值由我本人填进 `.env` / `.env.production`；AI 不读真实值、不复述内容，只报键名与存在性/长度。

### 新增一个依赖
1. 先停下报批：用途、许可证（GPL/AGPL 一律拒）、`npm install --dry-run` 的新增包数与被删条目。
2. 批准后安装，装完立刻在 linux 容器里重算锁文件（I018 会复发），并同步 `src/lib/licenses.ts` 与 `tests/licenses.test.ts`。
3. 若是 Server Component 用到的依赖、且内部有 Turbopack 解析不到的懒加载 `require`，按 I022 处置加进 `next.config.ts` 的 `serverExternalPackages`。

## 环境变量总表（键名 · 用途 · 必需性 · 读取点）

散落在各节的环境变量在这里汇总；改环境、排"填了不生效"的故障先看这张表。"必需性"分两档：**必须配置**
（缺失即功能不可用或启动失败）与**可选**（缺失时按既定行为降级，如整行不渲染）。值一律由我本人写进
`.env` / `.env.production`；AI 只核对键名与存在性、长度，不复述值（见"合规与安全红线"）。

| 键名 | 用途 | 必需性 | 主要读取点 | 模板位置 |
|---|---|---|---|---|
| `DATABASE_URL` | Prisma 连库串 | 必须 | `prisma/schema.prisma`、`src/lib/db.ts` | 两份 `.env*.example` |
| `NEXTAUTH_URL` | 对外站点地址；同时是站点 URL 单源（`src/lib/site.ts` 复用） | 必须 | `src/auth.ts`、`src/lib/site.ts` | 同上 |
| `NEXTAUTH_SECRET` | JWT 会话签名密钥（≥32 位） | 必须 | `src/auth.ts` | 同上 |
| `GITHUB_ID` | GitHub OAuth App 的 Client ID（D33） | 必须 | `src/auth.ts` | 同上 |
| `GITHUB_SECRET` | GitHub OAuth App 的 Client Secret | 必须 | `src/auth.ts` | 同上 |
| `ENCRYPTION_KEY` | GitHub access_token 落库加密密钥（64 位 hex，AES-256-GCM，Step 5） | 登录即必须（缺失时认领链路抛错） | `src/lib/token-crypto.ts` | 同上 |
| `AI_API_KEY` | 国内合规大模型 API Key（OpenAI 兼容协议）；AI 辅助生成草稿正文的凭据 | AI 生成必须（preflight 硬卡；缺了部署阶段就失败） | `src/lib/ai-client.ts` | 同上 |
| `AI_API_BASE_URL` | OpenAI 兼容接口基址；不填回落默认值 `https://dashscope.aliyuncs.com/compatible-mode/v1` | 可选（缺省回落默认值） | `src/lib/ai-client.ts` | 同上 |
| `AI_MODEL_NAME` | 模型名；不填回落默认值 `qwen-plus` | 可选（同上） | `src/lib/ai-client.ts` | 同上 |
| `OSS_REGION` | OSS 地域 ID，必须是 `oss-cn-beijing` 形式（写 `cn-beijing` 会拼出不存在的域名） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_BUCKET` | OSS 桶名（`laity-archive`） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_ACCESS_KEY_ID` | RAM 子账号 AK（策略只授 `oss:PutObject`） | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `OSS_ACCESS_KEY_SECRET` | RAM 子账号 SK | 上传功能必须 | `src/lib/oss.ts` | 同上 |
| `SITE_ICP` | ICP 备案号 | 可选（未配置整行不渲染） | `src/app/layout.tsx` → prop 传页脚 | `.env.production.example` |
| `SITE_POLICE_ICP` | 公安备案号 | 可选（同上） | 同上 | 同上 |
| `SITE_CONTACT_EMAIL` | 对外联系邮箱 | 可选（同上） | 同上 | 同上 |

- 新增一个环境变量的标准动作见「常见变更操作手册 → 新增一个环境变量」；生产要能进容器，必须在
  `docker-compose.prod.yml` 的 `app.environment` 显式列出——`--env-file` 只参与插值、不注入容器（I024 踩过）。
- 判"未配置是否合法"：合法用 `${VAR:-}`（三个 `SITE_*`），必须配置用 `${VAR:?}` 并进 preflight 清单（D12）。
- **已废弃，勿再用**：`ADMIN_PASSWORD`（D33 恢复 OAuth 后退役）、`ALLOWED_GITHUB_IDS`（白名单随 D20 退出）。
  `GITHUB_ID` / `GITHUB_SECRET` **不是**废弃项——它们是当前登录入口的必需键（见上表）。

## 已知坑速查（踩过的，别再踩）

| 场景 | 现象 | 处置 | 来源 |
|---|---|---|---|
| Windows 装包 | linux 平台 `@emnapi/*` 条目被静默删掉，`npm ci` 红 | 在 `node:24-slim` 容器里 `--package-lock-only` 重算 | I018 |
| MSYS 路径改写 | `docker -w /w` 变 `W:/`、`openssl -subj /CN=` 被吞 | 命令前加 `MSYS_NO_PATHCONV=1` | 环境实况 |
| Node 的 `/tmp` | 指的是 `D:\tmp`，不是 Git Bash 的 `/tmp` | 临时产物写仓库内 `tmp/`（已 gitignore、排除 lint） | I039 |
| 管道尾取退出码 | `\| head` 让退出码变 SIGPIPE 假红 | 输出重定向到文件后再判 `$?` | 环境实况 |
| 长跑进程输出 | `npm run dev > tmp/dev.log` 自激、整页重载 | 标准输出写到仓库外 | I048 |
| 正则 source 喂 HTML 属性 | 表单静默不提交（`pattern` 按 `v` flag 编译，尾随 `-`、双反斜杠都非法） | lib 里存"源串单源"，服务端 `RegExp` 派生，加两侧一致测试 | I060 / D26 |
| 对象名安全断言 | 断言把 `toISOString()` 生成的键自己拒了；白名单又放行 `../` | 键生成与断言拆到 `src/lib/object-key.ts`，逐段判、禁空段/`.`/`..` | D27 |
| Server Action 文件参数 | `formData.get("file")` 跨 RSC 边界后是 **Blob** 不是 File | 按 Blob 判并显式拒零字节 | D27 |
| 软著材料窗口 | 普通改动就可能顶破窗口容量（真实容量按整页折算，非 1500 行） | `assertWindowFit()` 拒出件，按其建议调整分带；改完必重出并提交 | I034-补2 |
| 合规位变量 | 填了 `.env.production` 页脚也不显示 | 在 `docker-compose.prod.yml` 的 `app.environment` 显式列出 | I024 / D19 |
| 开发容器被连带删除 | 生产预演 `down -v` 删掉了同名的开发容器 | 生产编排顶层写 `name: laity-prod` | I043 |
| 文档数据与代码实际不符 | 文档里的数字/版本/口径看着有效，实则已漂（如回归测试写"48 条"而实跑 73 条、归档 README 写"决策到 D29"而已有 D32、README 写 `npm install` 而门禁口径是 `npm ci`） | **每次发版前必须用 `npm test` 等实际输出核对文档中的数字与命令**，不靠记忆与上一版；被取代的旧口径在 DESIGN「零·补」裁剪地图里集中登记 | I071 / D32 |
| 等行替换被误判为"不动行数" | 文件头按铁律追加 2 行修改记录，就顶破软著材料窗口 | 任何改动（含注释、文件头）改完必须跑 `node tools/软著材料生成.mjs`；被拒按机器建议平移 ④ 段"折排版不折逻辑"的文件 | I034-补2 复发（A1 第八次） |
| 工作区 CRLF 与 LF 混用 | 批量脚本用 `"\n"` 拼多行匹配模式，在 CRLF 检出的文件里永不命中，报"未命中"看着像文案不存在；同一仓库两种行尾并存（未动过的文件是 CRLF、被 Edit 或脚本重写过的变成 LF） | 脚本先按文件自身探测行尾（`s.includes("\r\n")`）再拼模式；落笔前用 `node -e` 打印目标片段的 JSON 看真实字节 | 2026-11-06 第三批去英文 |
| 摘方法丢 `this` | `const pad = " ".repeat; pad(4)` 抛 `TypeError: String.prototype.repeat called on null or undefined`——方法一离开接收者就废 | 包一层箭头函数 `const pad = (n) => " ".repeat(n)`；`arr.join`、`s.split` 同理，批量脚本里的短别名一律写成函数 | 2026-11-06 第三批去英文 |
| 分页边界效应 | 改动收录清单内文件（尤其靠近分带边界的 forms.ts）会触发 meta 总行数变化 + 分页位移 + 边界行进出提交页；哪怕只改注释也会联动材料重出 | 材料必须重出，重出后须核对新增行合法性（无截断、无拼接、为合法源码行）与位移唯一性；验收标准为「无丢失、无重复、新增行合法」，而非「零增删」。**A1+B+C2 已实施（2026-11-13，commit `49b0ecc`）**：margin 随总行数在 115–163 之间波动，结构性最低 115（高于阈值 100），生成器阈值 `BOUNDARY_MARGIN=100`，余量低于阈值或切口行非法（空行 / ↳ 续行 / 文件分隔行）直接拒件；封面边界签名（前窗口第 1500 行止于 `error-text.ts`；后窗口起点与切口文件随总行数变化，以封面边界签名为准，不写死）变化即位移信号，重出后仍按上述三项核对 | Commit 7（I084 forms.ts 注释，2026-11-12）；Commit 10b（A1+B+C2，2026-11-13） |

## 术语表（统一叫法，避免同一件事三个名字）

| 术语 | 含义 | 不要写成 |
|---|---|---|
| 档案条目 | 一个项目在索引大厅里的展示单元（Project） | 卷册 / 卷宗 / 卡片 |
| 开发日志 | 一条 Before/After 复盘（Log） | 博客 / 文章 / 帖子 |
| 索引大厅 | 首页 `/` | 主页 / 落地页 |
| 日志大厅 | `/logs` | 列表页 |
| 存证 / 内容摘要 | 发布时按 D5 口径算出的 SHA-256，页面印章展示 | 防伪认证 / 区块链存证（对外措辞见红线） |
| 草稿 | `isPublished=false` 的日志，前台一律不可见 | 未发布 / 私密 |
| 下架 | 只翻 `isPublished`，保留历史摘要与时间（D9） | 删除 |
| 彻底删除 | 正文、摘要、时间一起移除、不可逆（需回填 slug） | 下架 |
| 归属 | 页面/路由属于前台还是后台（`src/lib/routes.ts`） | 权限 |

## 开工与交付自检清单（照着打勾，别靠记性）

### 开工前（每次会话开始）
1. 读本文件全文（事实基座）；与代码/现实冲突时以现实为准并报告冲突点，不自行抹平。
2. 查 ISSUES.md「台账概览 → 未结项速览」，看有无与本次任务相关的历史遗留。
3. 涉及结构或取舍读 DESIGN.md 的 D 编号，涉及行为边界读 SPEC.md 的 F 编号。
4. **写 Next.js 代码前先读 `node_modules/next/dist/docs/` 的对应指南**（版本红线，优先级最高）。
5. 复述本次范围与允许触碰的文件清单，等我确认后再动手。
6. 涉及外部动作（云控制台、服务器、推送、口令轮换）的，只出带判据的步骤清单，不代执行。

### 交付前（每次给出产物之前）
1. **四道门禁全 0**：`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm test`；命令与真实输出一起贴，没跑写"未验证"。
2. **视觉铁律自查**：grep 产出，命中 `rounded-`（非 `rounded-none`）、`shadow-`（非 `shadow-none`）、`bg-gradient`、图标库 import 一律自行返工。
3. **动过软著收录内的文件**：跑 `node tools/软著材料生成.mjs`，看 `assertWindowFit()` 是否放行；通过则重出两份 HTML 一并提交。
4. **凭据扫描**：产出物逐行扫凭据形态；先用注入的伪凭据验证扫描器有效，再采信"未见凭据"的结论。
5. **交付形态**：完整路径 + 完整文件内容，不留片段。
6. **如实标注**：未实测的项标"未验证"并写清缺哪一步；不用推断补全。
7. **范围外发现**：记 ISSUES.md，不动手改。
8. 末尾附 100 字以内研发日志素材（决策/坑/解法）。

## 工作方式（对 AI 的行为要求）

- 遵循 docs/00-开发方法论/我的AI协作开发方法论-五层防线.md 的五层防线与门禁流程
- 每个任务开工先复述范围与允许触碰的文件清单，等我确认
- 交付：完整路径 + 完整文件内容，不许片段
- 验收：粘贴实际执行的命令与真实输出；没执行的标"未验证"
- 信息不足：最多问 3 个阻塞性问题；能查代码/本文件得到答案的不许问我
- 遇到规格歧义、需改配置或依赖、验收达不成：立即停下问我。
  停下来问是正确行为，不是失败；禁止用编造填补不确定性
- 被安全策略拦下的动作（停容器、打印疑似凭据、绕过校验的变体命令）不重试、不换写法绕：
  该结论就如实标"未实测"，并给出一个不依赖该结论也能成立的设计（例如 CI 直接配一次性数据库，
  而不去赌"构建期不查库"）。
- 外部系统动作（云控制台、服务器、证书、口令轮换、推送）只能我本人执行。AI 负责给出
  带判据的步骤清单，判据不成立的步骤不许宣布完成。
- 本文件与代码/现实冲突时：以现实为准并报告冲突点，改本文件需我点名授权。
- 每次交付末尾附 100 字以内研发日志素材（决策/坑/解法），由我存入 docs/01-研发日志