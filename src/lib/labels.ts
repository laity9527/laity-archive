/**
 * 文件：src/lib/labels.ts
 * 描述：枚举值与日志条数的展示层中文映射单源：kind/status 只在这里翻译一次，页面与组件共用，未知值原样输出不编造
 * 作者：张磊
 * 创建日期：2026-11-05
 * 修改记录：
 * - 2026-11-05: 初始创建（核心界面英文标签中文化；取值单源仍是 src/lib/projects.ts 的 PROJECT_KINDS/PROJECT_STATUSES，本文件只管展示措辞）
 */

// 键为库里的真实取值（product/tool/site 与 WIP/LIVE/ARCHIVED），大小写按库中原样
const KIND_LABELS: Record<string, string> = {
  product: "产品",
  tool: "工具",
  site: "站点",
};

const STATUS_LABELS: Record<string, string> = {
  WIP: "进行中",
  LIVE: "已上线",
  ARCHIVED: "已归档",
};

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function logsCountLabel(count: number): string {
  return `${count} 篇日志`;
}
