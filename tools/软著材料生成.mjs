/**
 * 文件：tools/软著材料生成.mjs
 * 描述：生成软件著作权申请材料——源程序文档（50 行/页，超 60 页取前后各 30 页）与操作说明书（30 行/页），输出为 A4 定页可打印 HTML
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建（Phase 6 软著材料，登记名与版本经我确认）
 * - 2026-11-02: 收录清单补 content-hash / forms / time / error-text 四个新 lib 模块（收敛重构产物）
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

// 源程序收录顺序：数据模型 → 配置与部署 → 数据访问层 → 鉴权 → 页面 → 组件 → 样式
const ORDER = [
  "prisma/schema.prisma",
  "prisma/seed.ts",
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  "docker-compose.yml",
  "docker-compose.prod.yml",
  "Dockerfile",
  ".dockerignore",
  ".env.example",
  "src/lib/db.ts",
  "src/lib/logs.ts",
  "src/lib/projects.ts",
  "src/lib/publish.ts",
  "src/lib/content-hash.ts",
  "src/lib/forms.ts",
  "src/lib/time.ts",
  "src/lib/error-text.ts",
  "src/lib/oss.ts",
  "src/lib/markdown.tsx",
  "src/auth.ts",
  "src/proxy.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/components/Seal.tsx",
  "src/components/StatusBoard.tsx",
  "src/components/Timeline.tsx",
  "src/components/Editor.tsx",
  "src/components/SignInButton.tsx",
  "src/app/logs/page.tsx",
  "src/app/logs/[slug]/page.tsx",
  "src/app/projects/page.tsx",
  "src/app/projects/[slug]/page.tsx",
  "src/app/admin/layout.tsx",
  "src/app/admin/page.tsx",
  "src/app/admin/project-actions.ts",
  "src/app/admin/projects/page.tsx",
  "src/app/admin/log-actions.ts",
  "src/app/admin/upload-action.ts",
  "src/app/admin/logs/new/page.tsx",
  "src/app/admin/logs/[id]/edit/page.tsx",
];

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

const code = buildPages(readCodeLines(), CODE_LINES_PER_PAGE, { bodyClass: "code" });
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
    },
    null,
    1,
  ),
);
