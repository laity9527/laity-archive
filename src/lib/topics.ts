/**
 * 文件：src/lib/topics.ts
 * 描述：8 个主题与标签的映射（纯函数）：主题是读接口，不是新的数据库列
 * 作者：张磊
 * 创建日期：2026-11-13
 * 修改记录：
 * - 2026-11-13: 初始创建。依据 docs/00-开发方法论/标签与内容治理-2026-11-13.md 的提案，
 *               56 个标签按 8 个主题各归一次；tags 字段与历史数据均不改动。
 *               主题顺序即展示顺序，不要按字母重排——它按「部署 → 数据 → 前端 → 质量 →
 *               协作 → 安全 → 软著 → 项目」的阅读顺序排。
 */

export type TopicKey =
  | "deploy"
  | "data"
  | "frontend"
  | "quality"
  | "collab"
  | "security"
  | "copyright"
  | "project";

export type Topic = {
  key: TopicKey;
  label: string;
  tags: readonly string[];
};

export const TOPICS: readonly Topic[] = [
  {
    key: "deploy",
    label: "部署与运行时",
    tags: [
      "ali-oss",
      "OSS 上传",
      "环境变量",
      "serverExternalPackages",
      "Turbopack",
      "lockfile",
      "CI",
      "Proxy",
      "真 404",
      "no-store",
      "Cache Components",
      "Next 16",
      "favicon",
    ],
  },
  {
    key: "data",
    label: "数据与存证",
    tags: [
      "存证",
      "SHA-256",
      "先存再发",
      "对象键",
      "magic bytes",
      "sessionStorage",
      "会话判定",
      "validation",
    ],
  },
  {
    key: "frontend",
    label: "前端与视觉",
    tags: [
      "视觉令牌",
      "Tailwind v4",
      "WCAG",
      "响应式布局",
      "@container",
      "flex gap",
      "窗口非线性",
      "枚举映射",
      "CRLF",
      "文案中文化",
    ],
  },
  {
    key: "quality",
    label: "质量与门禁",
    tags: ["门禁", "铁律对拍", "可证伪验收", "健康检查", "可达性", "产品骨架"],
  },
  {
    key: "collab",
    label: "协作与事实",
    tags: ["事实基座", "工作法", "同 commit 同步", "规格对账"],
  },
  {
    key: "security",
    label: "安全与凭据",
    tags: ["凭据泄漏", "CORS", "bodySizeLimit", "Server Action", "this 绑定"],
  },
  {
    key: "copyright",
    label: "软著与材料",
    tags: ["软著材料", "打印分页", "折行", "assertWindowFit"],
  },
  {
    key: "project",
    label: "项目与索引",
    tags: [
      "archive",
      "first-entry",
      "laity-archive",
      "laity-hub",
      "github-sync",
      "beforeafter-log",
    ],
  },
];

// 一个标签只归一个主题：多归属会让计数与筛选解释不清（治理文档 §二）
const TAG_TO_TOPIC = new Map<string, TopicKey>(
  TOPICS.flatMap((topic) =>
    topic.tags.map((tag) => [tag, topic.key] as const),
  ),
);

const TOPIC_LABELS = new Map<TopicKey, string>(
  TOPICS.map((topic) => [topic.key, topic.label]),
);

const TOPIC_KEYS = new Set<TopicKey>(TOPICS.map((topic) => topic.key));

export function isTopicKey(value: string): value is TopicKey {
  return TOPIC_KEYS.has(value as TopicKey);
}

export function topicTags(key: TopicKey): readonly string[] {
  return TOPICS.find((topic) => topic.key === key)?.tags ?? [];
}

export function topicOfTag(tag: string): TopicKey | null {
  return TAG_TO_TOPIC.get(tag.trim()) ?? null;
}

// 入参是库里的 tags 数组：去重、按 TOPICS 顺序返回，调用方不需要再排序
export function topicsOfTags(tags: readonly string[]): TopicKey[] {
  const found = new Set<TopicKey>();

  for (const tag of tags) {
    const key = topicOfTag(tag);

    if (key) {
      found.add(key);
    }
  }

  return TOPICS.filter((topic) => found.has(topic.key)).map(
    (topic) => topic.key,
  );
}

export function topicLabel(key: TopicKey): string {
  return TOPIC_LABELS.get(key) ?? key;
}
