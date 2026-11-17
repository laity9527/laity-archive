/**
 * 文件：src/lib/text-diff.ts
 * 描述：修订历史的行级 diff 纯函数：按换行切分后做 LCS，输出 same / add / remove 三种行
 * 作者：张磊
 * 创建日期：2026-11-17
 * 修改记录：
 * - 2026-11-17: 初始创建（V4 P3 §7.6）。零依赖、无 IO；单侧超过 2000 行时截断并置 truncated，
 *               避免历史页在超长正文上做 O(n²) 级联导致请求超时。CJK 按整行比较，不按字符拆。
 */

export type DiffKind = "same" | "add" | "remove";

export type DiffLine = {
  kind: DiffKind;
  text: string;
};

export type DiffResult = {
  lines: DiffLine[];
  truncated: boolean;
};

const MAX_LINES = 2000;

function split(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n/g, "\n").split("\n");
}

/**
 * 行级 diff：a 为旧版，b 为当前版；add 表示当前新增，remove 表示旧版被删。
 * 同长度前缀/后缀不特殊处理——LCS 已能覆盖，代码更短，测试更好钉。
 */
export function diffLines(a: string, b: string, maxLines = MAX_LINES): DiffResult {
  const aAll = split(a);
  const bAll = split(b);
  const truncated = aAll.length > maxLines || bAll.length > maxLines;
  const left = aAll.slice(0, maxLines);
  const right = bAll.slice(0, maxLines);
  const n = left.length;
  const m = right.length;

  // dp[i][j] = left[i..] 与 right[j..] 的最长公共子序列长度
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i -= 1) {
    const row = dp[i];
    const next = dp[i + 1];
    for (let j = m - 1; j >= 0; j -= 1) {
      row[j] =
        left[i] === right[j]
          ? next[j + 1] + 1
          : Math.max(next[j], row[j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (left[i] === right[j]) {
      lines.push({ kind: "same", text: left[i] });
      i += 1;
      j += 1;
      continue;
    }

    // 相等时优先删除旧行，保证同一输入两次输出一致（可预测、可测试）
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ kind: "remove", text: left[i] });
      i += 1;
    } else {
      lines.push({ kind: "add", text: right[j] });
      j += 1;
    }
  }

  while (i < n) {
    lines.push({ kind: "remove", text: left[i] });
    i += 1;
  }

  while (j < m) {
    lines.push({ kind: "add", text: right[j] });
    j += 1;
  }

  return { lines, truncated };
}
