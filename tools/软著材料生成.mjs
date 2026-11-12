/**
 * 文件：tools/软著材料生成.mjs
 * 描述：生成软件著作权申请材料——源程序文档（50 行/页，超 60 页取前后各 30 页）与操作说明书（30 行/页），输出为 A4 定页可打印 HTML
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建（Phase 6 软著材料，登记名与版本经我确认）
 * - 2026-11-02: 收录清单补 content-hash / forms / time / error-text 四个新 lib 模块（收敛重构产物）
 * - 2026-11-03: 再补 site / sitemap-data 两个 lib、SiteNav 组件与 sitemap / robots 两个路由文件
 * - 2026-11-03: 收录顺序改为"按提交窗口排版"（I034）：数据模型与核心逻辑进前 30 页，站点骨架与访客界面进后 30 页，后台表单页放中间可折走段
 * - 2026-11-03: 登记上线基线新增的 7 个文件：image-signature / routes 两个 lib 进核心逻辑段，
 *               health 接口进中间段，SiteFooter / privacy / not-found / error 进后窗口末段
 * - 2026-11-03: 按折行后真实行数重新配平四段：① +② 收到 1486 行、④ 收到 1473 行，
 *               均 ≤ 1500 行窗口，proxy.ts 与 globals.css / layout.tsx 不再被切口打断；
 *               让出窗口的是 error-text / sitemap-data / Editor 与两个本地部署配置
 * - 2026-11-03: 登记 CI 工作流 .github/workflows/ci.yml（I037），与两个部署配置同组放折走段
 * - 2026-11-03: 收录清单由 ORDER 改为 BANDS（分四段、③ 标 foldable），新增 assertWindowFit()：
 *               非折走段文件被窗口切断或整份掉进折走段即拒绝生成。起因是 eslint 配置加了一行注释，
 *               就把 ①+② 从 1486 顶到 1501 行、proxy.ts 又被切掉一行——这种事不该靠人事后对拍
 * - 2026-11-03: 登记合规这一轮的三个新文件：sensitive-scan 进核心逻辑段（②），
 *               licenses 静态表进折走段（③），/licenses 页进后窗口（④）
 * - 2026-11-04: 取消 GitHub 登录（D20）这一轮的第十次出件：新文件 admin-password.ts 进 ②；
 *               ①+② 因此顶到 1500 行的窗口边缘（proxy.ts 恰好止于第 1500 行，零余量），
 *               把同为"常量 + 读环境变量"的 site.ts 平移到 ③ 让出 52 行——②→③ 平移不改 ④ 起点，后窗口不受影响；
 *               后窗口则因 ④ 涨到超容量把 globals.css 切掉 20 行，按 assertWindowFit 的处置建议
 *               把 ④ 里行数最少、逻辑最薄的 error.tsx（41 行）移进折走段。两次都是护栏先报错、我再配平，
 *               不是人估出来的：5453 行 / 110 页 / 收录 63
 * - 2026-11-04: 交互与可达性这一轮（第十三次窗口配平）：新文件 SubmitButton.tsx 登记进折走段；auth.ts 与
 *               admin-password.ts 各长了几十行，①+② 冲到 1537 行、`proxy.ts`（1386-1537）被前窗口切开。
 *               这次让位的是 tsconfig.json 与 eslint.config.mjs——两枚纯工具样板（编译选项与 ignore 列表），
 *               与 compose/Dockerfile 同类，移进 ③ 后 ①+② 回到 1500 以内，程序实质仍整份在前窗口。
 *               5626 行 / 113 页 / 收录 64
 * - 2026-11-04: 退出页与配置体检这一轮（第十四次）：SignOutButton.tsx 登记进折走段（与后台交互层同组）；
 *               auth.ts 再加配置体检后 proxy.ts 第三次被切开（1369-1520）——不再逐个文件临时让位，
 *               改为一次性把 db.ts、routes.ts、.env.example 三类无算法内容移出必可见段，
 *               给 ①+② 换回约 75 行余量（前窗口现止于 time.ts）。5723 行 / 115 页 / 收录 65
 * - 2026-11-05: 核心界面文案中文化这一轮：新文件 src/lib/labels.ts（枚举中文映射单源）登记进折走段 ③，
 *               与同为"常量表 + 查表函数"的 error-text.ts 相邻。放 ③ 而不放 ② 是为了不动 ①+② 的行数
 *               ——proxy.ts 被前窗口切开过三次，而 labels.ts 的三个调用方（首页、看板、日志大厅）都在 ④。
 *               本次 assertWindowFit() 未拒绝出件：前窗口仍止于 error-text.ts 第 1500 行（零余量，下轮加行要先配平），
 *               后窗口起于 privacy/page.tsx，labels.ts 整份落在省略段，属 ③ 段口径的正常结果而非漏登记。
 *               6655 行 / 134 页 / 收录 68
 * - 2026-11-06: 第三批开工第一步（负责人预批的让位）：src/app/licenses/page.tsx 自 ④ 平移进折走段 ③，
 *               与它消费的 licenses.ts 同段。起因是量测算出后窗口余量对总页数敏感——6721 行时余 41 行，
 *               一旦净加行跨过 6750 翻到 136 页，容量由 1471 掉到 1451、余量只剩 21 行。
 *               让位后 ④ 段从 1430 行降到 1321 行，第三批可安全加行。前窗口未受影响（①② 一字未动）。
 * - 2026-11-10: V2.0 Step 5 Commit 2：登记 github-sync-filter/github-sync 进 ②（Step 5 核心逻辑）、
 *               sync-actions 进 ③（与 log-actions 同属后台动作层）。前窗口预计顶到 1500 边缘，出件时看护栏。
 *
 *
 * 为什么每页要自己画页眉页码：Chrome 不支持 CSS @page 的 margin box（@top-center 等），
 * 官方文档明确相关属性"尚未被任何 user agent 支持"，所以分页与页眉必须由脚本定页生成，
 * 打印时选 A4、边距"无"、缩放 100%，并关掉浏览器的页眉页脚选项。
 * - 2026-11-06: 第十五次窗口配平（负责人裁断一批准）：prisma/seed.ts 内联 12 篇日志正文后从 ① 平移进折走段 ③ 末位；
 *               ①+② 保住整份可见，材料总页数 137 → 150（提交页数仍为前 30 + 后 30）。窗口判据实测：移动前生成器拒绝出件并报五个文件越界
 * - 2026-11-09: 第十六次登记（V2.0 Step 1，schema 改造伴随改动）：新增 prisma/backfill-zhanglei.ts 存量回填脚本，
 *               与 seed.ts 同性质登记进折走段 ③ 末位；assertComplete 先行拒件（新文件未登记清单），非窗口容量类拒件
 * - 2026-11-09: 第十七次窗口配平（V2.0 Step 2，负责人裁断 A 批准）：next.config.ts（73 行，构建配置，不承载业务逻辑）
 *               自 ① 平移进折走段 ③ 末位——本轮 projects.ts/logs.ts/schema.prisma 共涨约 108 行，把 proxy.ts（1338-1503）
 *               顶过前窗口 1500 切口；平移后 ①+② 回到 1430 行以内。先例：13 轮 tsconfig/eslint.config.mjs 平移同类
 * - 2026-11-09: 第十八次登记（V2.0 Step 3 阶段二）：两个详情页收录路径随目录迁移至 /u/[handle]/...
 *               （projects 详情在 ③、logs 详情在 ④），新增租户主页 src/app/u/[handle]/page.tsx 登记进 ④
 *               （访客可见界面，与首页同类）；assertComplete 先行拒件（新路径未登记），非窗口容量类拒件
 * - 2026-11-09: 第十九次窗口配平（V2.0 Step 3 阶段三，负责人裁断一批准）：SiteFooter.tsx（79 行，纯排版页脚）与
 *               src/app/projects/page.tsx（99 行，作品大厅纯列表排版）自 ④ 平移进折走段 ③——租户主页（+190 行）
 *               把 ④ 顶超后窗口、globals.css 头部被切口切掉；两文件都不承载算法，符合"折排版不折逻辑"判据
 * - 2026-11-09: 第二十次窗口配平（V2.0 Step 3 阶段三，负责人裁断一批准）：src/lib/forms.ts（61 行）自 ② 平移进
 *               折走段 ③——阶段一 logs/projects 涨行 + 阶段二 proxy 涨行累计把 ①+② 顶到 1533 行、proxy.ts 被
 *               前窗口 1500 切口打断；forms.ts 主体是常量表（LIMITS + 三组正则源串）+ 三个纯函数判，与 ③ 的
 *               error-text/licenses 同性质；content-hash.ts（20 行最小）因 D5 摘要唯一实现按铁律不动
 * - 2026-11-09: 第二十一次登记变更（V2.0 Step 4-A）：src/lib/admin-password.ts 随 Credentials 单口令退役
 *               从 ② 段摘除（文件已删，tests 同删）；auth.ts 重写为 GitHub OAuth，行数变化另跑窗口判据
 * - 2026-11-10: 第二十二次登记（V2.0 Step 6 Commit 1）：新增 ai-prompt（纯函数：提交列表→提示词、
 *               模型返回→BEFORE/AFTER 解析）与 ai-client（OpenAI 兼容协议客户端）登记进折走段 ③，
 *               与同族 github-sync-filter / token-crypto 相邻；①+② 零余量防线未动（error-text 止于第 1500 行）
 * - 2026-11-10: 第二十三次登记（V2.0 Step 6 Commit 2）：新增 ai-actions（AI 生成动作层）登记进 ③，
 *               与 sync-actions/upload-action 等后台动作同段；Editor 按钮为既有 ③ 段文件内改动，
 *               不出新文件；①+②、④ 均未动，出件看护栏
 * - 2026-11-11: V2.1 全局搜索：新增 src/lib/log-search.ts（matchLog 匹配纯函数：四字段子串匹配）
 *               登记进折走段 ③，与 logs.ts 相邻；调用方 searchLogs 在 ③ 内、页面在 ④，
 *               ①+② 零余量防线不动，出件看护栏
 * - 2026-11-11: F23/D34 阅读目录与进度条：新增 src/lib/toc.ts（extractToc 纯函数）登记进折走段 ③，
 *               与 log-search/ai-prompt 同族（调用方详情页在 ④、markdown.tsx 在 ③）；新增
 *               src/components/ArticleToc.tsx 登记进 ④（访客可见界面）。④ 因 ArticleToc + 详情页接线 +
 *               globals.css 进度条/rail/面板样式涨行，出件看 assertWindowFit
 * - 2026-11-11: F23/D34 窗口配平（负责人裁定 Option 2）：assertWindowFit 拒件（④ 1879 > 后窗口 1498，缺口 381），
 *               预案1（拆移动面板约 30–70 行）单独不够；按裁定把租户主页(190)/关于页(158)/登录页(92)自 ④ 平移进 ③
 *               （合计 440），④ 回到 1439 行装进后窗口，ArticleToc 整份留 ④ 不拆。三者皆排版/交互外壳，逻辑在 ②③ 可见
 * - 2026-11-12: F27 RSS 订阅 Commit 1：登记 src/lib/rss.ts 进折走段 ③（与 highlight/export/toc 同族的纯函数层，
 *               调用方 feed 路由下一步同段登记），①+② 零余量防线不动，出件看护栏
 * - 2026-11-12: F27 RSS 订阅 Commit 2：登记 src/app/feed.xml/route.ts 进折走段 ③（与 sitemap/robots/export route
 *               同族的对外出口层）；layout.tsx 属 ④ 段内行数增长，出件看护栏
 * - 2026-11-12: F26 标签聚合 Commit 4：登记 src/app/tags/[tag]/page.tsx 进 ④ 段（访客可见界面，与大厅/详情同类）；
 *               大厅与详情页标签链接接线属 ④ 段内行数增长，出件看护栏
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = "docs/04-软著材料";

const SOFT_NAME = "Laity 项目档案库软件";
const SOFT_VERSION = "V1.0";
const COPYRIGHT_OWNER = "张磊";
const DEV_DATE = "2026-10-30";

const CODE_LINES_PER_PAGE = 50; // 软著源程序：每页不少于 50 行
const DOC_LINES_PER_PAGE = 30; // 软著文档：每页不少于 30 行
const SUBMIT_PAGES_EACH_SIDE = 30; // 超过 60 页时提交前 30 页 + 后 30 页

// 收录顺序 = 排版策略，不是单纯的分层罗列。源程序超过 60 页时只提交前 30 页 + 后 30 页，
// 中间整段被折走（I034），所以顺序按"两个窗口各放什么"来排，并且各段行数必须装得下窗口：
//   窗口 = 30 页 × 50 行 = 1500 行（按折行后的真实行数计，不是物理行数）
//   ① + ② 与 ④ 属于"必须整份可见"的段，③ 是折走段，切口只允许落在 ③ 内部
// 这条约束不再靠人估：assertWindowFit() 每次生成都按真实行跨度检查，
// 任一非折走段文件被窗口切断或整份落进折走段就直接失败——第八、九两轮都是"看着装得下"而实际超行，
// 一行注释的增删就能把 proxy.ts 挤出窗口，这种事只能让机器盯着。
// 无论怎么排，assertComplete() 都保证 src 与 prisma 下没有一个文件被漏登记
const BANDS = [
  {
    mark: "①",
    name: "数据模型与运行时配置",
    files: [
      "prisma/schema.prisma",
    ],
  },
  {
    mark: "②",
    name: "核心逻辑：存证口径 → 数据访问 → 类型嗅探与上传 → 渲染消毒 → 鉴权与前置守卫",
    files: [
      "src/lib/content-hash.ts",
      "src/lib/publish.ts",
      "src/lib/projects.ts",
      "src/lib/sensitive-scan.ts",
      "src/lib/oss.ts",
      "src/auth.ts",
      "src/proxy.ts",
    ],
  },
  {
    mark: "③",
    name: "折走段：文案表与时刻格式化、出口层、后台表单/动作页、运维配置——形态重复度高，且它们调用的核心逻辑（存证、上传、鉴权）已整份出现在前窗口里",
    foldable: true,
    files: [
      "src/lib/error-text.ts",
      // 枚举中文映射同样是"一张常量表 + 一个查表函数"，与 error-text 同类，放折走段：
      // 它不进 ② 是为了不动 ①+② 的行数（proxy.ts 被前窗口切开过三次），
      // 而它的三个调用方（首页、看板、日志大厅）都在 ④，排版上读得通
      "src/lib/labels.ts",
      "src/lib/time.ts",
      // package.json 从 ① 让位进折走段（2026-11-05 第七轮）：next.config.ts 加 CSP 与 poweredByHeader
      // 涨行，proxy.ts（1358–1509）被 1500 切口打断；package.json 是依赖清单与脚本表，无程序逻辑
      "package.json",
      // 对象键生成与断言是从 oss.ts 拆出的纯计算（I061），与嗅探函数同类，放折走段；
      // 它的调用方 oss.ts 与 upload-action.ts 都已在窗口内可见
      "src/lib/object-key.ts",
      // token 加密是 node:crypto 的一层壳（Step 5），调用方 auth.ts 在 ② 整份可见；
      // 与 object-key 同类放折走段，不动 ①+② 行数（proxy.ts 被前窗口切开过多次）
      "src/lib/token-crypto.ts",
      // github-sync-filter 是 Step 5 的纯函数过滤（merge/无意义/去重/同日合并 + slug 净化），
      // 调用方 sync-actions 与 github-sync 都在 ②③ 可见载体；2026-11-10 第十六次窗口配平：
      // 进 ② 把 ①+② 顶过 1500，oss/auth/proxy 越界，由它让位
      "src/lib/github-sync-filter.ts",
      // github-sync 是 Step 5 的网络适配器（API 调用 + 并发限流），相对独立于鉴权/存证核心；
      // 2026-11-10 第十六次配平：进 ② 仍顶过 1500，auth/proxy 越界，由它让位
      "src/lib/github-sync.ts",
      // logs.ts 是数据访问层（DAL），取数逻辑的调用方（页面/动作）都在 ③④ 可见；
      // 2026-11-10 第十六次配平：与 github-sync 一同让位，确保 auth/proxy/publish/projects/content-hash 整份在前窗口
      "src/lib/logs.ts",
      // log-search 是 V2.1 全局搜索的匹配纯函数（四字段大小写不敏感子串匹配），
      // 调用方 searchLogs 在 logs.ts 内、页面在 ④；与 ai-prompt/object-key 同类放 ③，不动 ①+② 行数
      "src/lib/log-search.ts",
      // highlight 是 F24 搜索关键词高亮的纯函数（indexOf 切段 + 片段窗口提取，不构造正则），
      // 与 log-search/toc 同族；调用方页面在 ④，登记 ③ 不动 ①+② 零余量防线
      "src/lib/highlight.ts",
      // export 是 F25 全站数据导出的纯函数（payload 组装：排序确定性 + counts 统计 + ISO 化），
      // 与 highlight/log-search 同族；调用方动作层在 ③、JSON 序列化与响应在动作层，登记 ③ 不动 ①+② 防线
      "src/lib/export.ts",
      // toc.ts 是 F23/D34 的阅读目录抽取纯函数（ATX/setext、围栏与缩进代码跳过、行内剥离），
      // 调用方详情页在 ④、markdown.tsx 在 ③；与 log-search/ai-prompt 同族放 ③，不动 ①+② 零余量防线
      "src/lib/toc.ts",
      // rss.ts 是 F27 RSS 订阅的纯函数层（XML 转义、Markdown 尽力剥离、feed 组装），
      // 与 highlight/export/toc 同族；调用方 feed 路由下一步同段登记，①+② 零余量防线不动
      "src/lib/rss.ts",
      // ai-prompt 是 Step 6 的纯函数层（提交列表→提示词、模型返回→BEFORE/AFTER 解析），调用方是后台动作层；
      // 与 github-sync-filter 同族放 ③，不动 ①+② 的行数（零余量防线下安全）
      "src/lib/ai-prompt.ts",
      // ai-client 是 Step 6 的 OpenAI 兼容协议客户端（Bearer 认证 + 30 秒超时），与 token-crypto 同属"一层壳"；
      // 调用方动作层在 ③，与 github-sync 同族放 ③，①+② 零余量防线不动
      "src/lib/ai-client.ts",
      // Markdown 出口只是 react-markdown + rehype-sanitize 的一层壳（34 行），消毒规则在调用处（④ 的详情页）与注释里都看得见；
      // 本轮 forms/logs/admin-password 三处各涨几行，①+② 到 1511 把 proxy.ts 切开，由它让位
      "src/lib/markdown.tsx",
      // 图片类型嗅探是"读文件头几个字节比表"，调用它的上传动作本就在 ③；
      // 本轮 forms.ts / projects.ts / error-text 各自长了几行，①+② 第 1501 行起把 proxy.ts 切开，
      // 按 assertWindowFit 的处置建议由它让位（存证、鉴权、消毒三类真逻辑仍整份在前窗口）
      "src/lib/image-signature.ts",
      // 许可清单是一张静态表（值来自 node_modules 实测），逻辑在 tests/licenses.test.ts 的对拍里
      "src/lib/licenses.ts",
      // /licenses 页自 ④ 平移进来（2026-11-06），与上面那张表成对：本页只是把表排版出来
      "src/app/licenses/page.tsx",
      // 站点标识同样是"一串常量 + 读环境变量"，没有算法；第十二轮（取消 GitHub 登录）为让出口令模块的位置移进 ③，
      // ②→③ 平移不改 ④ 的起点，后窗口不受影响
      "src/lib/site.ts",
      // 第四轮结构配平（2026-11-04）：前窗口已经第三次被同一段挤破（auth.ts 每加一次配置体检，
      // proxy.ts 就被切一次），不再逐个文件临时让位，而是一次性把三类"无算法"的内容移进折走段——
      // db.ts 是一行 Prisma 单例样板，routes.ts 是路径前缀常量表（判定由 tests/site.test.ts 对拍锁定），
      // .env.example 与已在 ③ 的 .env.production.example 同属环境变量模板。合计给 ①+② 换回约 64 行余量
      "src/lib/db.ts",
      "src/lib/routes.ts",
      ".env.example",
      "src/app/api/auth/[...nextauth]/route.ts",
      "src/app/api/health/route.ts",
      "src/lib/sitemap-data.ts",
      "src/app/sitemap.ts",
      "src/app/robots.ts",
      // feed.xml 路由是 F27 RSS 订阅出口（请求期取数 + 组装 + XML 响应），
      // 与 sitemap/robots/export route 同族（对外出口层），①+② 零余量防线不动
      "src/app/feed.xml/route.ts",
      "src/app/admin/layout.tsx",
      "src/app/admin/log-actions.ts",
      "src/app/admin/sync-actions.ts",
      // export/route 是 F25 全站数据导出路由处理器（会话校验→查库→组装→JSON 下载响应），
      // 与后台动作层同族，放 ③ 不动 ①+② 零余量防线；原方案为动作返回 Response，实测被 RSC
      // 序列化通道拒绝（只收纯对象），按官方下载范例改路由处理器
      "src/app/admin/export/route.ts",
      // ai-actions 是 Step 6 的 AI 动作层（会话校验 → 表单解析 → 调用客户端 + 解析结果），
      // 与另外三个后台动作同层，放 ③ 不动 ①+② 零余量防线
      "src/app/admin/ai-actions.ts",
      "src/app/admin/upload-action.ts",
      "src/app/admin/project-actions.ts",
      "src/app/admin/page.tsx",
      "src/app/admin/projects/page.tsx",
      "src/app/admin/logs/new/page.tsx",
      "src/app/admin/logs/[id]/edit/page.tsx",
      // 项目详情页让位给后窗口的站点外壳：项目列表页仍在 ④ 段，功能面不缺
      // V2.0 Step 3 阶段一：路由迁至 /u/[handle]/projects/[slug]，收录路径随目录迁移
      "src/app/u/[handle]/projects/[slug]/page.tsx",
      "src/components/Editor.tsx",
      "src/components/SignInButton.tsx",
      "src/components/SignOutButton.tsx",
      // 提交按钮与编辑器、登录表单同属后台交互层：这一层整体在折走段是第八轮起定的口径
      // （它的调用方——各表单页——也都在这一段），本轮它整份落在省略段属于该口径的正常结果，
      // 不是漏登记：assertComplete() 已经核过它在清单里
      "src/components/SubmitButton.tsx",
      // 印章组件在这里：它只是把 contentHash 与发布时间排版出来，存证的真逻辑在
      // publish.ts / content-hash.ts（前窗口）与详情页（后窗口，含 <Seal /> 的调用处）
      "src/components/Seal.tsx",
      // 部署产物集中放这里：生产编排与多阶段构建文件都是配置而非程序逻辑，
      // 而 ② 段新增的 sensitive-scan 必须留在前窗口——它是这一轮的程序实质
      "docker-compose.prod.yml",
      "Dockerfile",
      "docker-compose.yml",
      ".dockerignore",
      ".env.production.example",
      ".github/workflows/ci.yml",
      // tsconfig 与 eslint 配置是纯工具样板（编译选项与 ignore 列表，没有一行程序逻辑），
      // 和上面的部署配置同类；本轮 auth.ts 与 admin-password.ts 各长了几十行，①+② 顶到 1537 行
      // 把 proxy.ts 切开了，先由这两个样板文件让位——程序实质仍在前窗口
      "tsconfig.json",
      "eslint.config.mjs",
      // 错误边界只有一句提示与一个重试按钮，渲染真逻辑在 globals.css/布局里；
      // 挪进折走段是为了把 ④ 段整体推后，让 globals.css 的头部回到后窗口内（本轮加进出口令模块后窗口差 20 行）
      "src/app/error.tsx",
      // 404 外壳与 error.tsx 同类：一句文案 + 两个出口链接，没有算法；
      // 本轮为把 /about 留在后窗口可见而由它让位（收录不减，assertComplete 核过）
      "src/app/not-found.tsx",
      // 状态看板（67 行）本轮自 ④ 平移进来：D30 A1 给 proxy.ts 文件头加了两行修改记录，
      // 后窗口切口推到第 5151 行，`globals.css` 的头部（设计令牌定义处，正是本轮改的地方）又被切出去。
      // 按 assertWindowFit 的处置在 ④ 段挑让位者：Timeline 是 SPEC F02 点名的 Before/After 时间轴形态、
      // 最能代表本站界面，不折；看板只是把 getArchiveBoard() 的结果排版成若干行，
      // 而该取数口在 ② 段（src/lib/projects.ts）整份可见——折走的是排版，不是逻辑。
      "src/components/StatusBoard.tsx",
      // 隐私页是一份静态承诺文案（数据全在页面内的常量数组，无算法）；本轮 globals.css 为正文标题补了
      // 一段样式，④ 涨到把 globals.css 头部切在后窗口外，按 assertWindowFit 的建议由它让位（收录不减）
      "src/app/privacy/page.tsx",
      // 种子脚本从 ① 让位进折走段末位（2026-11-06，负责人裁断一）：prisma/seed.ts 内联 12 篇已发布日志后由 67 行涨到 507 行，
      // 其中 18,419 字符是 Markdown 正文文案；留在 ① 会把 ② 段尾部（sensitive-scan/oss/admin-password/auth/proxy）整块顶出前 1500 行，
      // 而那五个是必须整份可见的核心逻辑。按'折排版不折逻辑'判定让位：D5 摘要算法（src/lib/content-hash.ts）与数据模型仍在前面整份可见。
      "prisma/seed.ts",
      // 存量数据回填脚本登记进折走段（2026-11-09，V2.0 Step 1 伴随改动）：与 seed.ts 同属 prisma 侧脚本——
      // 一次性的迁移期回填工具，D5 摘要算法与数据模型仍整份在前窗口；assertComplete 先拒了它（未登记清单），
      // 故登记并重跑窗口判据，非窗口容量类拒件，不涉及平移
      "prisma/backfill-zhanglei.ts",
      // next.config.ts 自 ① 平移进折走段（2026-11-09 第十六次窗口配平，负责人裁断 A）：构建配置不承载业务逻辑，
      // 与 13 轮先例的 tsconfig/eslint 同类；本轮 V2.0 Step 2 的 projects.ts/logs.ts/schema.prisma 共涨约 108 行，
      // 把 proxy.ts（1338-1503）顶过前窗口 1500 切口。平移后 ①+② 回到 1430 行以内，proxy 整份可见
      "next.config.ts",
      // SiteFooter 与作品页自 ④ 平移进折走段（2026-11-09 第十九次窗口配平，负责人裁断一批准）：
      // 租户主页（+190 行）把 ④ 顶超后窗口、globals.css 头部被切口切掉。SiteFooter 是纯排版页脚、
      // 作品页是纯列表排版，两者都不承载算法，符合"折排版不折逻辑"判据；访客可见界面仍有
      // 首页/日志大厅/租户主页/关于在窗口内
      "src/components/SiteFooter.tsx",
      "src/app/projects/page.tsx",
      // 租户主页 / 关于页 / 登录页自 ④ 平移进来（F23/D34，负责人裁定 Option 2，见 ④ 段注释）：
      // 与 projects 大厅同类——租户主页复用看板取数（②）、关于页静态文案、登录页是后台交互层外壳，
      // 折走的是排版与外壳，不是逻辑；移入后 ④ 从 1879 回到 1439 行，装进后窗口 1498
      "src/app/u/[handle]/page.tsx",
      "src/app/about/page.tsx",
      "src/app/login/page.tsx",
      // ArticleToc 自 ④ 平移进来（F25 导出轮，负责人裁断批准）：③ 段新增两个导出文件后总行数
      // 非线性回落使后窗口容量 1492→1478，④ 超余量、globals.css 头部被切口切掉；按"折排版不折逻辑"
      // 让位——toc.ts 抽取口径已在 ③ 整份可见，ArticleToc 是目录右栏/折叠面板的排版交互外壳，
      // 详情页（④）的调用处仍可见
      "src/components/ArticleToc.tsx",
      // forms.ts 自 ② 平移进折走段（2026-11-09 第二十次窗口配平，负责人裁断一批准）：主体是常量表
      // （LIMITS 上限表 + SLUG/REPO_URL/ID 三组正则源串）+ 三个纯函数判（pickParam/readField/safeCallbackUrl），
      // 与已在 ③ 的 error-text.ts / licenses.ts 同性质；①+② 因阶段一 logs/projects 涨行 + 阶段二 proxy 涨行
      // 累计到 1533 行、proxy.ts（1350-1533）被前窗口 1500 切口打断。输入校验口径仍经页面 select/pattern
      // 属性与 ③ 的 error-text 可见（折的是排版与常量表，不是校验逻辑本身）
      "src/lib/forms.ts",
    ],
  },
  {
    mark: "④",
    name: "站点外壳（样式令牌 + 根布局 + 导航）与访客可见界面，末段为对外公示页（开源致谢 / 关于；隐私页、404 外壳与页脚自本轮起进折走段）",
    files: [
      "src/app/globals.css",
      "src/app/layout.tsx",
      "src/components/SiteNav.tsx",
      // StatusBoard.tsx 于本轮自 ④ 平移进折走段 ③（2026-11-05，D30 A1，见 ③ 段注释）
      "src/components/Timeline.tsx",
      "src/app/page.tsx",
      "src/app/logs/page.tsx",
      // V2.0 Step 3 阶段一：日志详情路由迁至 /u/[handle]/logs/[slug]，收录路径随目录迁移
      "src/app/u/[handle]/logs/[slug]/page.tsx",
      // 标签聚合页（F26）：访客可见界面，列表行复用大厅形态；
      // Timeline 容器查询的第六个调用点，ul 必须带 @container
      "src/app/tags/[tag]/page.tsx",
      // 租户主页 / 关于页 / 登录页于本轮（F23/D34，负责人裁定 Option 2）自 ④ 平移进折走段 ③：
      // ArticleToc + 详情页接线 + globals.css 进度条/rail/面板样式把 ④ 顶到 1879 行（后窗口仅 1498），
      // 移出这三页（190+158+92=440）后 ④ 回到 1439 行。三者皆排版/交互外壳——租户主页复用 getArchiveBoard（②）、
      // 关于页是静态文案、登录页是 SignInButton（③）的外壳，逻辑均在别处可见；搜索大厅与首页/详情/目录右栏保留可见
      // not-found.tsx 本轮起进折走段（2026-11-05，第八轮）：新增 /about 页让 ④ 涨了 155 行，
      // 后窗口切口把 globals.css 的头部（令牌定义处）切了出去；按 assertWindowFit 的处置建议，
      // 由这份只有一句文案与两个出口链接的 404 外壳让位——与它上面的 error.tsx 同类，
      // 而视觉令牌与导航必须整份可见
    ],
  },
];

const ORDER = BANDS.flatMap((band) => band.files);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|css|prisma)$/.test(name)) acc.push(full);
  }
  return acc;
}

// 收录完整性自检：src 与 prisma 下的每个源文件都必须在 ORDER 里，漏了就报错而不是静默少交
function assertComplete() {
  const onDisk = [...walk("src"), ...walk("prisma")]
    .map((p) => p.split("\\").join("/"))
    .filter((p) => !p.endsWith(".d.ts"));
  const missing = onDisk.filter((p) => !ORDER.includes(p));

  if (missing.length > 0) {
    throw new Error(`以下源文件未列入收录清单，拒绝生成：\n  ${missing.join("\n  ")}`);
  }

  const absent = ORDER.filter((p) => !existsSync(join(ROOT, p)));

  if (absent.length > 0) {
    throw new Error(`收录清单里有磁盘上不存在的文件：\n  ${absent.join("\n  ")}`);
  }
}

// 按真实行流求出每个文件在"折行后行流"里占的跨度：从自己的分隔行起，到下一个分隔行前止
function fileSpans(lines) {
  const marks = [];

  lines.forEach((line, i) => {
    const m = /^—— 文件：(.+) ——$/.exec(line);
    if (m) marks.push({ file: m[1], start: i + 1 });
  });

  return marks.map((mk, i) => ({
    file: mk.file,
    start: mk.start,
    end: i + 1 < marks.length ? marks[i + 1].start - 1 : lines.length,
  }));
}

// 窗口适配自检：非折走段的每个文件必须整份落在前窗口或后窗口之内。
// 被切口打断、或整份掉进折走段，都直接失败——窗口大小是"折行后 1500 行"，
// 与物理行数无关，任何一处注释增删都可能把它挤出去，所以这条必须机器判定。
function assertWindowFit(lines) {
  const windowRows = SUBMIT_PAGES_EACH_SIDE * CODE_LINES_PER_PAGE;
  const total = lines.length;

  if (total <= windowRows * 2) {
    return { 需要折页: false, 总行数: total, 窗口行数: windowRows };
  }

  // 窗口必须按"整页"算，不是按"末尾 1500 行"算：buildPages 取的是最后 30 个页块，
  // 末页不足 50 行时那半页也占一个名额，所以后窗口能装的行数比 1500 少。
  // 第八、九轮两次都是按 1500 估，结果 globals.css 的头部正好掉在被切掉的半页里
  const totalPages = Math.ceil(total / CODE_LINES_PER_PAGE);
  const front = { from: 1, to: SUBMIT_PAGES_EACH_SIDE * CODE_LINES_PER_PAGE };
  const back = {
    from: (totalPages - SUBMIT_PAGES_EACH_SIDE) * CODE_LINES_PER_PAGE + 1,
    to: total,
  };
  const mustBeWhole = new Set(BANDS.filter((b) => !b.foldable).flatMap((b) => b.files));
  const spans = fileSpans(lines);
  const inside = (s, w) => s.start >= w.from && s.end <= w.to;

  const violations = spans.filter(
    (s) => mustBeWhole.has(s.file) && !(inside(s, front) || inside(s, back))
  );
  const at = (row) => spans.find((s) => row >= s.start && row <= s.end);

  if (violations.length > 0) {
    const detail = violations
      .map((s) => {
        const how =
          s.start <= front.to && s.end > front.to
            ? `被前窗口切口打断（前窗口止于第 ${front.to} 行，本文件 ${s.start}-${s.end}）`
            : s.start < back.from && s.end >= back.from
              ? `头部被后窗口切口切掉（后窗口起于第 ${back.from} 行，本文件 ${s.start}-${s.end}）`
              : `整份落在折走段（本文件 ${s.start}-${s.end}，折走段 ${front.to + 1}-${back.from - 1}）`;
        return `  ${s.file}：${how}`;
      })
      .join("\n");

    throw new Error(
      `以下文件必须整份可见，却没进窗口，拒绝生成：\n${detail}\n` +
        `处置：把该文件所在段里行数最少、最不重要的一个移进折走段（BANDS 里 foldable: true 的 ③ 段）。` +
        `窗口容量：前 ${front.to - front.from + 1} 行 / 后 ${back.to - back.from + 1} 行（按整页折算，不是固定 1500）`
    );
  }

  return {
    需要折页: true,
    总行数: total,
    总页数: totalPages,
    前窗口: `第 1-${front.to} 行（第 1-${SUBMIT_PAGES_EACH_SIDE} 页）`,
    后窗口: `第 ${back.from}-${back.to} 行（第 ${totalPages - SUBMIT_PAGES_EACH_SIDE + 1}-${totalPages} 页，末页仅 ${total - (totalPages - 1) * CODE_LINES_PER_PAGE} 行，容量按整页折算是 ${back.to - back.from + 1} 行）`,
    前窗口止于: `第 ${front.to} 行（该行属于 ${at(front.to)?.file ?? "?"}）`,
    后窗口起于: `第 ${back.from} 行（该行属于 ${at(back.from)?.file ?? "?"}）`,
    必须整份可见文件数: mustBeWhole.size,
    折走段行数: back.from - 1 - front.to,
  };
}

function readCodeLines() {
  const lines = [];

  for (const file of ORDER) {
    let raw;
    try {
      raw = readFileSync(join(ROOT, file), "utf8");
    } catch {
      console.warn(`跳过缺失文件：${file}`);
      continue;
    }

    lines.push(`—— 文件：${file} ——`);
    for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
      lines.push(...wrapCodeLine(line.replace(/\t/g, "    ").replace(/[ \t]+$/, "")));
    }
    lines.push("");
  }

  return lines;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 代码页用 white-space: pre，超宽的行会被页面直接裁掉；中文按双宽计算显示列，
// 超过 CODE_MAX_COLS 就折行，续行以 ↳ 开头（该符号是排版产物，不属于源码）
const CODE_MAX_COLS = 96;
// 正文 10.5pt 无衬线，一个汉字约 3.7mm，可用宽度 182mm ≈ 49 个汉字 = 98 列，取 92 留余量
const DOC_MAX_COLS = 92;
function isWide(ch) {
  const c = ch.codePointAt(0);

  return (
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe6f) ||
    (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6)
  );
}

function displayCols(text) {
  let width = 0;
  for (const ch of text) width += isWide(ch) ? 2 : 1;
  return width;
}

function wrapCodeLine(line) {
  if (displayCols(line) <= CODE_MAX_COLS) {
    return [line];
  }

  const chunks = [];
  let current = "";
  let width = 0;

  for (const ch of line) {
    const chWidth = isWide(ch) ? 2 : 1;

    if (width + chWidth > CODE_MAX_COLS) {
      chunks.push(current);
      current = "↳";
      width = 1;
    }

    current += ch;
    width += chWidth;
  }

  if (current) chunks.push(current);

  return chunks;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// 行既可以是纯字符串（源程序）也可以是 { text, cls }（说明书带标题样式）
function renderRows(rows) {
  return rows
    .map((row) => {
      const line = typeof row === "string" ? { text: row, cls: "" } : row;

      return `<div class="ln${line.cls ? " " + line.cls : ""}">${
        escapeHtml(line.text) || "&nbsp;"
      }</div>`;
    })
    .join("");
}

function pageShell({ index, total, bodyClass, rows, note }) {
  const header = `<div class="hd"><span>${SOFT_NAME} ${SOFT_VERSION}</span><span>${
    note ? `${note}　` : ""
  }第 ${index} 页 / 共 ${total} 页</span></div>`;

  return `<section class="page ${bodyClass}">${header}<div class="body">${rows}</div></section>`;
}

function buildPages(lines, perPage, { bodyClass, noteFor }) {
  const all = chunk(lines, perPage);
  const limit = SUBMIT_PAGES_EACH_SIDE * 2;
  let selected = all.map((rows, i) => ({ rows, no: i + 1, note: "" }));

  if (all.length > limit) {
    const head = all.slice(0, SUBMIT_PAGES_EACH_SIDE);
    const tail = all.slice(-SUBMIT_PAGES_EACH_SIDE);
    const skipped = all.length - limit;

    selected = [
      ...head.map((rows, i) => ({ rows, no: i + 1, note: "前段" })),
      ...tail.map((rows, i) => ({
        rows,
        no: SUBMIT_PAGES_EACH_SIDE + i + 1,
        note: `后段（本页为原文档第 ${SUBMIT_PAGES_EACH_SIDE + skipped + i + 1} 页）`,
      })),
    ];

    return {
      pages: selected.map((p) =>
        pageShell({
          index: p.no,
          total: limit,
          bodyClass,
          rows: renderRows(p.rows),
          note: p.note,
        }),
      ),
      totalPages: all.length,
      submittedPages: limit,
      skipped,
      totalLines: lines.length,
    };
  }

  return {
    pages: selected.map((p) =>
      pageShell({
        index: p.no,
        total: all.length,
        bodyClass,
        rows: renderRows(p.rows),
        note: noteFor ?? "",
      }),
    ),
    totalPages: all.length,
    submittedPages: all.length,
    skipped: 0,
    totalLines: lines.length,
  };
}

const STYLE = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #000; }
.page { width: 210mm; height: 297mm; padding: 14mm 14mm 12mm; page-break-after: always; overflow: hidden; background: #fff; }
.page:last-child { page-break-after: auto; }
.hd { display: flex; justify-content: space-between; font: 9pt/1.4 "Noto Sans SC", sans-serif; border-bottom: 1px solid #000; padding-bottom: 1.5mm; }
.body { margin-top: 3mm; }
.code .ln { font: 8.6pt/4.72mm ui-monospace, Consolas, monospace; white-space: pre; }
.prose .ln { font: 10.5pt/7.9mm "Noto Sans SC", sans-serif; white-space: pre; }
.prose .ln.h1 { font-weight: 700; font-size: 13pt; }
.prose .ln.h2 { font-weight: 700; font-size: 11.5pt; }
.prose .ln.h3 { font-weight: 700; }
.cover { text-align: center; }
.cover .body { margin-top: 40mm; font: 12pt/12mm "Noto Sans SC", sans-serif; }
.cover .t1 { font-size: 20pt; font-weight: 700; letter-spacing: 1mm; }
.cover .t2 { font-size: 14pt; margin-top: 6mm; }
.cover .meta { margin-top: 26mm; text-align: left; display: inline-block; font-size: 11pt; line-height: 9mm; }
@media print { body { -webkit-print-color-adjust: exact; } }
`;

function coverPage(kind, stats) {
  return `<section class="page cover"><div class="body">
<div class="t1">${SOFT_NAME} ${SOFT_VERSION}</div>
<div class="t2">${kind === "code" ? "源程序文档" : "软件操作说明书"}</div>
<div class="meta">
著作权人：${COPYRIGHT_OWNER}<br>
开发完成日期：${DEV_DATE}<br>
源程序总行数：${stats.totalLines} 行<br>
文档总页数：${stats.totalPages} 页（本次提交 ${stats.submittedPages} 页${
    stats.skipped ? `，中间省略 ${stats.skipped} 页` : "，不足 60 页全部提交"
  }）<br>
每页行数：${kind === "code" ? CODE_LINES_PER_PAGE : DOC_LINES_PER_PAGE} 行<br>
${
    kind === "code"
      ? "排版说明：文件之间以「—— 文件：路径 ——」分隔；行首 ↳ 表示上一行超出页宽自动折行，该符号不属于源码内容<br>"
      : ""
  }打印设置：A4 / 边距"无" / 缩放 100% / 关闭浏览器页眉页脚
</div>
</div></section>`;
}

// 说明书：把 Markdown 压成"行流"，再统一按显示列折行；折行后行数才是真实行数，
// 配合 .prose 的 white-space: pre，保证"每页 30 行"数得出来也印得下
function docLines(md) {
  const lines = [];
  const push = (text, cls = "") => lines.push({ text, cls });

  let inCode = false;

  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      push(`　　${raw}`);
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);

    if (heading) {
      push("");
      const level = heading[1].length;

      push(heading[2], level === 1 ? "h1" : level === 2 ? "h2" : "h3");
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      push(line.replace(/^\s*[-*]\s+/, "　　• "));
      continue;
    }
    // 表格行不折列，按可读文本呈现
    if (line.trim().startsWith("|")) {
      if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
      push("　　" + line.trim().replace(/\|/g, "　").replace(/　+/g, "　"));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      push(line.replace(/^\s*(\d+)\.\s+/, "　　$1. "));
      continue;
    }
    if (line.startsWith("---")) {
      continue;
    }
    if (line.trim() === "") {
      push("");
      continue;
    }

    push(line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1"));
  }

  return wrapItemsToCols(lines, DOC_MAX_COLS);
}

function wrapItemsToCols(items, limit) {
  const out = [];

  for (const item of items) {
    if (displayCols(item.text) <= limit) {
      out.push(item);
      continue;
    }

    let current = "";
    let width = 0;

    for (const ch of item.text) {
      const chWidth = isWide(ch) ? 2 : 1;

      if (width + chWidth > limit) {
        out.push({ text: current, cls: item.cls });
        current = "　　";
        width = displayCols(current);
      }

      current += ch;
      width += chWidth;
    }

    if (current) out.push({ text: current, cls: item.cls });
  }

  return out;
}

assertComplete();

const codeLines = readCodeLines();
const windowFit = assertWindowFit(codeLines);
const code = buildPages(codeLines, CODE_LINES_PER_PAGE, { bodyClass: "code" });
writeFileSync(
  join(ROOT, OUT_DIR, "源程序文档.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${SOFT_NAME} ${SOFT_VERSION} 源程序文档</title><style>${STYLE}</style></head><body>${coverPage(
    "code",
    code,
  )}${code.pages.join("\n")}</body></html>`,
);

const docSource = join(ROOT, OUT_DIR, "软件操作说明书.md");
let doc = { pages: [], totalLines: 0, totalPages: 0, submittedPages: 0, skipped: 0 };

try {
  const docPages = docLines(readFileSync(docSource, "utf8"));
  doc = buildPages(docPages, DOC_LINES_PER_PAGE, { bodyClass: "prose" });
  writeFileSync(
    join(ROOT, OUT_DIR, "软件操作说明书.html"),
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${SOFT_NAME} ${SOFT_VERSION} 软件操作说明书</title><style>${STYLE}</style></head><body>${coverPage(
      "doc",
      doc,
    )}${doc.pages.join("\n")}</body></html>`,
  );
} catch {
  console.warn("未找到 docs/04-软著材料/软件操作说明书.md，跳过说明书");
}

console.log(
  JSON.stringify(
    {
      源程序: {
        总行数: code.totalLines,
        每页行数: CODE_LINES_PER_PAGE,
        总页数: code.totalPages,
        提交页数: code.submittedPages,
        省略页数: code.skipped,
      },
      说明书: {
        总行数: doc.totalLines,
        每页行数: DOC_LINES_PER_PAGE,
        总页数: doc.totalPages,
        提交页数: doc.submittedPages,
        省略页数: doc.skipped,
      },
      收录文件数: ORDER.length,
      窗口适配: windowFit,
    },
    null,
    1,
  ),
);
