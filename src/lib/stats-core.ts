/**
 * 文件：src/lib/stats-core.ts
 * 描述：统计底座的纯函数层（V5 Phase 3）：内存访问计数器、聚合形状组装——不碰数据库，
 *       node --test 可直接钉住口径与并发安全
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（Phase 3 任务 2）。VisitCounter 自增为同步单步（读改写之间无 await），
 *               Node 单线程下不会交错丢计数；computeStats 只做形状组装与派生口径，不二次查库
 */
export class VisitCounter {
  private readonly store: Map<string, number>;

  constructor(store?: Map<string, number>) {
    this.store = store ?? new Map();
  }

  /** 同步自增：读改写之间无 await，单线程事件循环下天然原子 */
  increment(key: string): void {
    this.store.set(key, (this.store.get(key) ?? 0) + 1);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.store);
  }
}

/** 近 7 天窗口起点（纯）：发布数聚合的边界判定，单测钉住窗口长度 */
export function sevenDaysAgo(now: Date): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

/** 反转率（纯）：OVERTURNED / (VERIFIED + OVERTURNED)；分母 0 → null（看板显示 —） */
export function overturnRate(verified: number, overturned: number): number | null {
  const denominator = verified + overturned;

  if (denominator === 0) {
    return null;
  }

  return overturned / denominator;
}

// 进程内共享计数器：重启即清零（内存计数口径，不做持久化埋点）
export const serviceVisits = new VisitCounter();
export const faqVisits = new VisitCounter();

export type StatsInput = {
  /** 线索总量（含全部状态） */
  leadTotal: number;
  /** 待处理新增：状态 NEW 的线索数 */
  leadNew: number;
  /** 近 7 天创建的线索数 */
  leadLast7Days: number;
  /** 线索状态分布（NEW/REPLIED/ARCHIVED/SPAM → 条数） */
  leadByStatus: Record<string, number>;
  /** 媒体总量（未软删） */
  mediaTotal: number;
  /** 已软删媒体数（回收站） */
  mediaDeleted: number;
  /** 证据媒体数（isEvidence 且未软删） */
  evidenceMedia: number;
  /** 服务页访问计数快照 */
  serviceVisits: Record<string, number>;
  /** FAQ 页访问计数快照 */
  faqVisits: Record<string, number>;
  /** 近 7 天发布数（已发布轨迹） */
  publishedLast7Days: number;
  /** 待锚定版本行总数（gitSha 为 null） */
  pendingAnchorVersions: number;
  /** 反转率（null = 无已裁决轨迹，看板显示 —） */
  overturnRate: number | null;
};

export type StatsOverview = {
  generatedAt: string;
  leads: {
    total: number;
    new: number;
    last7Days: number;
    byStatus: Record<string, number>;
  };
  media: {
    total: number;
    deleted: number;
    evidence: number;
  };
  visits: {
    services: Record<string, number>;
    faq: Record<string, number>;
  };
  derived: {
    publishedLast7Days: number;
    pendingAnchorVersions: number;
    overturnRate: number | null;
  };
};

/** 聚合形状组装（纯）：口径在此钉死，测试直接对拍 */
export function computeStats(input: StatsInput): StatsOverview {
  return {
    generatedAt: new Date(0).toISOString(),
    leads: {
      total: input.leadTotal,
      new: input.leadNew,
      last7Days: input.leadLast7Days,
      byStatus: input.leadByStatus,
    },
    media: {
      total: input.mediaTotal,
      deleted: input.mediaDeleted,
      evidence: input.evidenceMedia,
    },
    visits: {
      services: input.serviceVisits,
      faq: input.faqVisits,
    },
    derived: {
      publishedLast7Days: input.publishedLast7Days,
      pendingAnchorVersions: input.pendingAnchorVersions,
      overturnRate: input.overturnRate,
    },
  };
}
