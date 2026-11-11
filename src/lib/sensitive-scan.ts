/**
 * 文件：src/lib/sensitive-scan.ts
 * 描述：发布前敏感信息扫描的纯函数：识别手机号、身份证、云厂商与 GitHub 凭据形态、私钥块、JWT、明文口令赋值与内网 IP
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（合规方案 2.2.3"发布前检测"落地）。零依赖，纯正则
 * - 2026-11-11: findAll 原先只用 "g" 重建正则，丢掉原 pattern 的 /i 标志，「明文口令赋值」退化为大小写敏感
 *   会漏判大写键名；改为按原 pattern 的 flags 重建（缺 g 时补 g），并新增对应回归测试
 *
 * 误报是这条功能的主要风险：日志里本来就要写 commit SHA、contentHash、版本号与公网 IP。
 * 所以规则分两种作用域——数字形态类（手机号/身份证/IP/AK）只在"词元"内匹配并整体跳过长度 ≥16 的
 * 十六进制摘要；跨标点的形态（password=xxx、私钥块、JWT）必须在全文上匹配，否则会被切散而永远命不中。
 * 邮箱单独归为提示级：联系方式常常是故意公开的，拿它拦发布只会逼人关掉整个功能。
 */

export type SensitiveCode =
  | "accessKey"
  | "githubToken"
  | "privateKey"
  | "jwt"
  | "inlineSecret"
  | "cnMobile"
  | "cnIdCard"
  | "privateIp"
  | "email";

export type SensitiveHit = {
  code: SensitiveCode;
  label: string;
  count: number;
  // 只给打码后的片段，避免把命中的完整凭据再抄一遍到页面或截图里
  samples: string[];
  // 提示级不拦发布，只有阻截级才要求"已核对"确认
  advisory: boolean;
};

type Rule = {
  code: SensitiveCode;
  label: string;
  // token = 逐词元匹配（可跳过十六进制摘要）；text = 全文匹配（规则本身含标点）
  scope: "token" | "text";
  advisory?: boolean;
  pattern: RegExp;
};

const RULES: Rule[] = [
  {
    code: "privateKey",
    label: "私钥块",
    scope: "text",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    code: "inlineSecret",
    label: "明文口令赋值",
    scope: "text",
    pattern:
      /\b(?:password|passwd|pwd|secret|access_key_secret|api[_-]?key|client[_-]?secret|token)\b["']?\s*[:=]\s*["']?[^\s"'`,，。；]{6,}/i,
  },
  {
    code: "jwt",
    label: "JWT 令牌",
    scope: "text",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    code: "githubToken",
    label: "GitHub 令牌",
    scope: "text",
    pattern: /\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/,
  },
  {
    code: "accessKey",
    label: "云厂商 AccessKey ID",
    scope: "token",
    pattern: /\b(?:LTAI[A-Za-z0-9]{12,24}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})\b/,
  },
  {
    code: "cnIdCard",
    label: "身份证号",
    scope: "token",
    pattern:
      /(?<!\d)\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/,
  },
  {
    code: "cnMobile",
    label: "手机号",
    scope: "token",
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/,
  },
  {
    code: "privateIp",
    label: "内网地址",
    scope: "token",
    pattern:
      /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
  },
  {
    code: "email",
    label: "邮箱地址（提示级，通常是有意公开的）",
    scope: "text",
    advisory: true,
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/,
  },
];

// 词元 = 连续的非分隔字符。分隔符取空白与中英文标点，但保留 . _ - + @ 让 IP、域名、标识符成整段
function tokens(text: string) {
  return text.split(/[\s，。；：、！？“”‘’()（）[\]{}<>《》|\\/^*~`"'#=+&%$!;-]+/);
}

// 十六进制摘要、commit SHA 属于"要展示的证据"，不是凭据
function isHexLike(token: string) {
  return /^[0-9a-f]{16,}$/i.test(token);
}

function mask(value: string) {
  return value.length <= 10 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`;

}

function findAll(pattern: RegExp, haystack: string) {
  // 必须保留原 pattern 的 flags（如明文口令赋值的 /i），matchAll 又要求 /g：缺则补
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...haystack.matchAll(new RegExp(pattern.source, flags))].map((m) => m[0]);
}

export function scanSensitive(text: string): SensitiveHit[] {
  if (!text) {
    return [];
  }

  const hits: SensitiveHit[] = [];

  for (const rule of RULES) {
    const found =
      rule.scope === "text"
        ? findAll(rule.pattern, text)
        : tokens(text).flatMap((token) =>
            token && !isHexLike(token) ? findAll(rule.pattern, token) : [],
          );

    if (found.length > 0) {
      hits.push({
        code: rule.code,
        label: rule.label,
        count: found.length,
        samples: [...new Set(found)].slice(0, 3).map(mask),
        advisory: rule.advisory === true,
      });
    }
  }

  return hits;
}

// 只有阻截级命中才需要"已核对"确认；提示级命中展示但不拦发布
export function hasBlockingHit(hits: SensitiveHit[]) {
  return hits.some((hit) => !hit.advisory);
}
