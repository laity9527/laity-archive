/**
 * 文件：src/lib/version-conflict.ts
 * 描述：版本号槽位冲突检测（V5 Phase 1 回填的纯判据）：给定 (traceId, version) 槽位清单，
 *       返回全部重复槽位的冲突说明；无冲突返回空数组
 * 作者：张磊
 * 创建日期：2026-11-18
 * 修改记录：
 * - 2026-11-18: 初始创建。从 prisma/migrate-to-v5.ts 抽出为纯函数，供回填脚本调用与单元测试
 *               直接钉住——冲突场景 dry-run 必须报错终止，判据不能散在脚本里
 */

export type VersionSlot = {
  traceId: string;
  version: number;
};

export function findVersionConflicts(slots: VersionSlot[]): string[] {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    const key = `${slot.traceId}#${slot.version}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const conflicts: string[] = [];
  for (const [key, count] of counts) {
    if (count > 1) {
      const [traceId, version] = key.split("#");
      conflicts.push(`trace ${traceId}：版本号 ${version} 出现 ${count} 次`);
    }
  }
  return conflicts;
}