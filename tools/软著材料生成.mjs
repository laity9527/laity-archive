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
 *
 * 为什么每页要自己画页眉页码：Chrome 不支持 CSS @page 的 margin box（@top-center 等），
 * 官方文档明确相关属性"尚未被任何 user agent 支持"，所以分页与页眉必须由脚本定页生成，
 * 打印时选 A4、边距"无"、缩放 100%，并关掉浏览器的页眉页脚选项。
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
      "prisma/seed.ts",
      "package.json",
      "next.config.ts",
    ],
  },
  {
    mark: "②",
    name: "核心逻辑：存证口径 → 数据访问 → 输入校验 → 类型嗅探与上传 → 渲染消毒 → 鉴权与前置守卫",
    files: [
      "src/lib/content-hash.ts",
      "src/lib/publish.ts",
      "src/lib/logs.ts",
      "src/lib/projects.ts",
      "src/lib/forms.ts",
      "src/lib/sensitive-scan.ts",
      "src/lib/oss.ts",
      "src/lib/markdown.tsx",
      "src/lib/admin-password.ts",
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
      "src/lib/time.ts",
      // 图片类型嗅探是"读文件头几个字节比表"，调用它的上传动作本就在 ③；
      // 本轮 forms.ts / projects.ts / error-text 各自长了几行，①+② 第 1501 行起把 proxy.ts 切开，
      // 按 assertWindowFit 的处置建议由它让位（存证、鉴权、消毒三类真逻辑仍整份在前窗口）
      "src/lib/image-signature.ts",
      // 许可清单是一张静态表（值来自 node_modules 实测），逻辑在 tests/licenses.test.ts 的对拍里
      "src/lib/licenses.ts",
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
      "src/app/admin/layout.tsx",
      "src/app/admin/log-actions.ts",
      "src/app/admin/upload-action.ts",
      "src/app/admin/project-actions.ts",
      "src/app/admin/page.tsx",
      "src/app/admin/projects/page.tsx",
      "src/app/admin/logs/new/page.tsx",
      "src/app/admin/logs/[id]/edit/page.tsx",
      // 项目详情页让位给后窗口的站点外壳：项目列表页仍在 ④ 段，功能面不缺
      "src/app/projects/[slug]/page.tsx",
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
    ],
  },
  {
    mark: "④",
    name: "站点外壳（样式令牌 + 根布局 + 导航页脚）与访客可见界面，末段为合规页（隐私 / 开源致谢 / 404）",
    files: [
      "src/app/globals.css",
      "src/app/layout.tsx",
      "src/components/SiteNav.tsx",
      "src/components/SiteFooter.tsx",
      "src/components/StatusBoard.tsx",
      "src/components/Timeline.tsx",
      "src/app/page.tsx",
      "src/app/logs/page.tsx",
      "src/app/logs/[slug]/page.tsx",
      "src/app/projects/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/licenses/page.tsx",
      "src/app/login/page.tsx",
      "src/app/not-found.tsx",
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
