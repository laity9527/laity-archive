/**
 * 文件：src/lib/ai-prompt.ts
 * 描述：AI 辅助生成（Step 6 / F22）的纯函数层：把一组 GitHub 提交信息编码成系统提示词文本；
 *      从大模型返回文本中健壮解析 BEFORE / AFTER 两段（容忍 markdown 代码块包裹、前后杂质文本；
 *      解析失败返回 null，由调用方保留「（等待补充）」，不静默编造内容）。
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（Step 6 Commit 1）
 * - 2026-11-10: Step 6 Commit 2：补 extractCommits（"- 消息"列表行解析、去重去空）与
 *               AI_MAX_COMMITS（单次 12 条上限，超限动作层返回 AI_002）
 * - 2026-11-13: 新增 buildContextPrompt——没有 Commit 列表时，按标题与现有正文续写；
 *               输出契约与 buildPrompt 完全一致（JSON BEFORE/AFTER），解析层不变
 * - 2026-11-13: 按负责人要求把单次 Commit 上限 12 → 20（最新同步草稿已有 14 条，
 *               原上限会把正常的同步草稿挡在 AI_002）
 */

export interface AiDraft {
  beforeContent: string;
  afterContent: string;
}

const PLACEHOLDER = "（等待补充）";

/** F22 成本边界：单次生成最多处理的 Commit 条数（AI_002 的判定阈值） */
export const AI_MAX_COMMITS = 20;

/**
 * 从列表形态正文（github-sync 生成的草稿把提交列表写在 AFTER 里，每行 "- 消息"）中提取提交信息。
 * 保留出现顺序、剔除空行与重复项；BEFORE 正文里也可能混着 "- " 列表行，动作层会两处都试。
 */
export function extractCommits(text: string): string[] {
  const seen = new Set<string>();
  const commits: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^- /.test(line)) continue;

    const message = line.slice(2).trim();
    if (message.length === 0 || seen.has(message)) continue;

    seen.add(message);
    commits.push(message);
  }

  return commits;
}

/** 剥掉 markdown 代码块（```json / ```）后返回核心内容，无代码块则原样返回 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n?```$/i);
  return fence ? fence[1].trim() : trimmed;
}

/** 截取文本中第一个 "{" 到最后一个 "}" 之间的窗口，作为 JSON 兜底尝试 */
function braceWindow(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start !== -1 && end > start ? text.slice(start, end + 1) : "";
}

/** 依次尝试：原文 → 剥代码块 → 括号窗口；返回解析出的 JSON 对象，全失败返回 null */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const candidates = [text.trim(), stripCodeFence(text), braceWindow(stripCodeFence(text))];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // 换下一个候选，不打印（纯函数，失败由调用方降级）
    }
  }
  return null;
}

/**
 * 把一组提交信息拼成系统提示词：要求模型扮演资深工程师，按 BEFORE（问题与决策）/ AFTER（实施与复盘）
 * 两段输出一份 JSON 对象。prompt 里内嵌了输出约定，请求体与模型选择在 ai-client 层，不在这里。
 */
export function buildPrompt(commitMessages: string[], repoName: string): string {
  const items = commitMessages
    .map((message) => message.replace(/\s+/g, " ").trim())
    .filter((message) => message.length > 0);
  const section = items.map((message, index) => `${index + 1}. ${message}`).join("\n");

  return [
    "你是一名资深软件工程师，正在为个人开发复盘档案撰写一条条目正文。",
    `本次内容来自仓库「${repoName}」的以下 ${items.length} 条提交（按时间从旧到新排列）：`,
    "",
    section,
    "",
    "请据此写出两段 Markdown 正文：",
    "【BEFORE】这次提交之前存在什么问题或分歧、作者当时的取舍与出发点是什么。",
    "【AFTER】这次提交最终是怎么做的：实施重心、方案取舍、以及可复用的复盘结论。",
    "",
    "要求：",
    "- 只依据上面给出的提交信息做合理推断，不虚构具体代码细节、文件名或数字。",
    "- 语气克制，像工程师写复盘；不要营销腔，不要复述提交信息本身。",
    "- 信息不足的字段填「（等待补充）」，不编造。",
    `- 输出必须是一行 JSON 对象：{"BEFORE":"", "AFTER":""}，不要输出任何其它文字。`,
  ].join("\n");
}

export interface AiContextInput {
  title: string;
  beforeContent: string;
  afterContent: string;
}

/**
 * 无 Commit 列表时的回退提示词：只依据标题与现有正文续写/改写。
 * 与 buildPrompt 共用同一输出契约（JSON BEFORE/AFTER），调用方解析逻辑不变。
 * 每段正文截到 4000 字，避免把整篇长文塞进上下文。
 */
export function buildContextPrompt(input: AiContextInput): string {
  const clip = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 4000) : "（空）";
  };

  return [
    "你是一名资深软件工程师，正在为个人开发复盘档案补全一条条目正文。",
    `标题：${input.title.trim() || "（空）"}`,
    "现有 BEFORE（可能为空）：",
    clip(input.beforeContent),
    "现有 AFTER（可能为空）：",
    clip(input.afterContent),
    "",
    "请据此补全或改写两段 Markdown 正文：",
    "【BEFORE】这次工作之前存在什么问题或分歧、当时的取舍与出发点。",
    "【AFTER】最终怎么做、实施重心、方案取舍与可复用的复盘结论。",
    "",
    "要求：",
    "- 只依据标题与现有正文做合理补全，不虚构具体代码细节、文件名或数字。",
    "- 已有正文中的事实要保留，不推翻作者已经写下的判断。",
    "- 语气克制，像工程师写复盘；不要营销腔。",
    "- 信息不足的字段填「（等待补充）」，不编造。",
    `- 输出必须是一行 JSON 对象：{"BEFORE":"", "AFTER":""}，不要输出任何其它文字。`,
  ].join("\n");
}

/**
 * 解析大模型返回文本为 BEFORE / AFTER 两段。
 * 两种失败都返回 null：① 文本无法按 JSON 解析；② 缺少两个键之一。
 * 两个键都是占位符时照常返回（调用方可自行把它当作"信息不足，未产出"处理）。
 */
export function parseAiResponse(responseText: string): AiDraft | null {
  const json = extractJsonObject(responseText);
  if (!json) return null;

  const beforeContent = json.BEFORE;
  const afterContent = json.AFTER;
  if (typeof beforeContent !== "string" || typeof afterContent !== "string") return null;

  return { beforeContent: beforeContent || PLACEHOLDER, afterContent: afterContent || PLACEHOLDER };
}
