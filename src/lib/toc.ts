/**
 * 文件：src/lib/toc.ts
 * 描述：阅读目录抽取（F23/D34）：从 Markdown 源文按渲染序抽 h1–h3，生成与 markdown.tsx 盖 id 规则一一对应的锚点清单；纯函数，node --test 可覆盖
 * 作者：张磊
 * 创建日期：2026-11-11
 * 修改记录：
 * - 2026-11-11: 初始创建（ATX/setext、围栏与缩进代码跳过、块引用/列表标记剥离、行内格式剥离；
 *               与渲染器的计数对齐由 ArticleToc 客户端自证兜底，错位即整体不画目录）
 */

export type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

// 行内格式 → 纯文本，口径对齐 react-markdown（CommonMark，无 GFM）渲染后的 textContent：
// 图片是 void 元素不贡献文本（整段删掉，alt 也不留）、链接/自动链接取可见文本、代码与强调只留内容。
// 实体解码放在剥标签之后：&lt;b&gt; 在渲染器里是字面文本 "<b>"，先解码再剥标签会把它误删。
// 已知边界（由客户端自证兜底，不在这里硬凑）：代码 span 内的字面 * 与实体、标题内裸 HTML、
// 列表 continuation 里的深层缩进标题——这些场景下文本对不上时目录整体不画，而不是指错锚点。
function headingText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<((?:https?|mailto):[^>\s]+)>/g, "$1")
    .replace(/(`+)([\s\S]*?)\1/g, "$2")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/(?<![A-Za-z0-9_])_([\s\S]+?)_(?![A-Za-z0-9_])/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// 与 markdown.tsx 的 tocIdPrefix 覆写共用一条规则：第 n 个 h1/h2/h3（渲染序）拿 `${idPrefix}-${n}`。
// 只收 1–3 级：h4–h6 渲染器不盖 id，这里也不收，两侧计数才不会串号。
export function extractToc(source: string, idPrefix: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = source.split(/\r\n|\r|\n/);
  let fenceChar = "";
  let fenceLen = 0;
  // setext 下划线（=== / ---）只认"前面是段落文本"；块引用/列表行剥标记后不算段落，
  // 否则 "- foo\n---" 会被误判成 setext，而渲染器给的是列表 + 分隔线
  let para: string[] = [];

  const push = (text: string, level: 1 | 2 | 3) => {
    items.push({ id: `${idPrefix}-${items.length}`, text, level });
  };

  for (const raw of lines) {
    const line = raw.replace(/^\t+/, (m) => "    ".repeat(m.length));

    if (fenceChar) {
      const close = new RegExp(`^ {0,3}${fenceChar}{${fenceLen},}[ \\t]*$`);
      if (close.test(line)) {
        fenceChar = "";
        fenceLen = 0;
      }
      continue;
    }

    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open) {
      fenceChar = open[1][0];
      fenceLen = open[1].length;
      para = [];
      continue;
    }

    // 顶层缩进代码：≥4 空格的井号不是标题。懒延续（段落后紧跟缩进行）同样不是标题，口径一致
    if (/^ {4,}/.test(line)) {
      continue;
    }

    if (line.trim() === "") {
      para = [];
      continue;
    }

    let body = line;
    let structural = false;
    const quote = /^ {0,3}(?:>[ \t]?)+/.exec(body);
    if (quote) {
      body = body.slice(quote[0].length);
      structural = true;
    }
    const list = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+/.exec(body);
    if (list) {
      body = body.slice(list[0].length);
      structural = true;
    }
    if (/^ {4,}/.test(body)) {
      para = [];
      continue;
    }

    const atx = /^ {0,3}(#{1,6})(?:[ \t]+([\s\S]*?))?[ \t]*$/.exec(body);
    if (atx) {
      const level = atx[1].length;
      if (level <= 3) {
        // 收尾井号序列须由空格引出的才算（"## foo##" 的 foo## 是正文，"## foo ##" 才剥）
        const text = (atx[2] ?? "").replace(/(?:^|[ \t])#+[ \t]*$/, "");
        push(headingText(text), level as 1 | 2 | 3);
      }
      para = [];
      continue;
    }

    const setext = /^ {0,3}(=+|-+)[ \t]*$/.exec(body);
    if (setext && !structural && para.length > 0) {
      push(headingText(para.join(" ")), setext[1][0] === "=" ? 1 : 2);
      para = [];
      continue;
    }

    if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(body)) {
      para = [];
      continue;
    }

    if (structural) {
      para = [];
      continue;
    }
    para.push(body.trim());
  }

  return items;
}