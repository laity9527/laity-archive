/**
 * 文件：src/lib/content-hash.ts
 * 描述：存证摘要的唯一计算口径（D5）：标题、BEFORE 正文、AFTER 正文按换行拼接，UTF-8 后取 SHA-256 小写十六进制
 * 作者：张磊
 * 创建日期：2026-11-02
 * 修改记录：
 * - 2026-11-02: 从 src/lib/publish.ts 抽出，消除 publish 与 prisma/seed 两份口径真源
 */
import { createHash } from "node:crypto";

// D5 口径：title + "\n" + beforeContent + "\n" + (afterContent ?? "")
export function computeContentHash(
  title: string,
  beforeContent: string,
  afterContent?: string | null,
) {
  return createHash("sha256")
    .update(`${title}\n${beforeContent}\n${afterContent ?? ""}`, "utf8")
    .digest("hex");
}
