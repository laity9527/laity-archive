/**
 * 文件：src/lib/ai-client.ts
 * 描述：AI 辅助生成（Step 6 / F22）的客户端层：OpenAI 兼容协议调 POST ${base}/chat/completions，
 *      Bearer 认证取 AI_API_KEY；30 秒超时（AbortSignal.timeout）；非 200 用状态码与截断的响应体报错，
 *      错误信息不回显密钥值（只报键名）。配置缺失时 fail-fast，由调用方（Server Action）降级为 banner。
 * 作者：张磊
 * 创建日期：2026-11-10
 * 修改记录：
 * - 2026-11-10: 初始创建（Step 6 Commit 1）
 */

const DEFAULT_AI_API_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_AI_MODEL_NAME = "qwen-plus";
/** 单次请求超时：30 秒内等不到就中止（长文生成给足往返，但不让一次失败无限挂起） */
const AI_REQUEST_TIMEOUT_MS = 30_000;

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

function readEnv(name: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? "" : value;
}

/** 读取并校验三个配置项：AI_API_KEY 缺失即抛错；另两项缺省回落默认值（不两处各写一份） */
export function resolveAiConfig(): AiConfig {
  const apiKey = readEnv("AI_API_KEY");
  if (!apiKey) {
    throw new Error("AI_API_KEY 未配置（AI 辅助生成功能不可用），请在环境变量里补齐");
  }
  return {
    apiKey,
    baseUrl: readEnv("AI_API_BASE_URL") || DEFAULT_AI_API_BASE_URL,
    modelName: readEnv("AI_MODEL_NAME") || DEFAULT_AI_MODEL_NAME,
  };
}

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

/**
 * 调用大模型生成草稿正文文本。成功时返回 choices[0].message.content（模型输出的原始文本，
 * 含可能的 JSON 包裹，交由 parseAiResponse 解析）；失败时抛 AiError，不静默降级。
 */
export async function generateAiDraft(prompt: string): Promise<string> {
  const config = resolveAiConfig();

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [{ role: "system", content: prompt }],
    }),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "响应体读取失败");
    throw new AiError(`AI 接口返回 ${response.status}：${body.slice(0, 200)}`);
  }

  const data: unknown = await response.json().catch(() => null);
  const content = extractMessageContent(data);
  if (!content) {
    throw new AiError("AI 接口响应里没有可用的生成内容");
  }
  return content;
}

function extractMessageContent(data: unknown): string {
  if (data === null || typeof data !== "object") return "";
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first: unknown = choices[0];
  if (first === null || typeof first !== "object") return "";
  const message = (first as { message?: unknown }).message;
  if (message === null || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}
