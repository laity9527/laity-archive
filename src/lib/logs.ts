/**
 * 文件：src/lib/logs.ts
 * 描述：前台日志数据访问封装，内部强制 isPublished: true（草稿隔离）
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建最小版（列表查询），Phase 2 补齐详情查询
 * - 2026-10-30: 列表支持 project/tag 筛选；新增 getSafeLogBySlug 详情查询
 * - 2026-10-30: 新增 isPublishedLogSlug 供 Proxy 前置判定 404 状态码
 * - 2026-10-30: 追加管理侧查询 listAdminLogs / getAdminLogById（不经过 isPublished 过滤，仅供后台）
 * - 2026-11-04: 删掉零调用的 listAdminLogs（D27）：后台概览与编辑页各有各的取数，这个全表查询自Phase 4后没人引；顺带给前窗口腾出 7 行
 * - 2026-11-06: 新增 getLatestLogs（首页「最新日志」按发布时间排序，见 D13 修订）；getSafeLogs 的 take 选项随唯一调用方迁走一并删除
 * - 2026-11-09: V2.0 Step 2：getSafeLogBySlug / isPublishedLogSlug 改走 userId_slug 复合键，
 *               新增 handle 默认参数（'zhanglei'，内部经 projects.ts 的 resolveUserId 解析 userId）；
 *               过渡期 /logs/[slug] 与 proxy 404 判定只覆盖该租户，Step 3 全局大厅口径随路由改造收口
 * - 2026-11-09: V2.0 Step 3 阶段一：handle 由路由传入、默认参数移除；getSafeLogs 的 filter 新增 handle
 *               （详情页用它挡住同名 slug 的跨租户日志，不给维持全局大厅口径）；
 *               getSafeLogs/getLatestLogs 的 include 补 user.handle（大厅行拼 /u/[handle]/... 链接用）；
 *               getLatestLogs 新增 userId 第二参数供租户主页取该租户最新日志
 * - 2026-11-09: V2.0 Step 4-B：getAdminLogById 加 userId 条件（findFirst 复合键），
 *               include 补 user.handle——编辑页「看前台」链接拼 /u/[handle]/logs/[slug] 要用
 * - 2026-11-11: V2.1 新增全局搜索：searchLogs 在 getSafeLogs 之上内存过滤（大厅公域口径甲，
 *               isPublished 恒定）；匹配逻辑抽至 src/lib/log-search.ts 的 matchLog 纯函数
 * - 2026-11-12: 新增 hasPublishedTag（F26 标签聚合页 proxy 前置判定：标签是否有已发布日志，
 *               select id 保持索引层，与 isPublishedLogSlug 同构）
 * - 2026-11-13: O1/O2 查询层：抽 buildLogWhere 单源、新增 getLogList/getLogFacets（本轮无调用方，
 *               页面行为不变；新查询不取正文）
 * - 2026-11-13: 新增 searchLogsLimited（保真 F24 四字段子串；tags 走参数化原生 SQL）
 * - 2026-11-13: 显著升级 B1：筛选新增 topic（主题 key → 该主题标签集合的 hasSome），
 *               与 tag 同一层 AND；getLogFacets 同一次查询内派生项目计数与主题计数，
 *               不新增查询、不改数据模型
 * - 2026-11-13: 显著升级 B2：新增 getLogContext——一次查询取本租户全部已发布日志的
 *               邻接所需列，再交给 src/lib/related.ts 的纯函数挑前后篇与相关阅读
 * - 2026-11-13: 首页主题入口：新增 getTopicCounts——只取 tags 一列，按 topics.ts 的
 *               8 个主题计数；首页因此为 3 次查询，仍在 O8 的 ≤3 预算内
 * - 2026-11-13: Phase C 后台日志列表：新增 getAdminLogList（状态筛选 + 标题搜索 + 页码分页），
 *               只取列表列，不取正文；前台查询口径（isPublished）不用于后台
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { escapeLikePattern, matchLog } from "@/lib/log-search";
import { resolveUserId } from "@/lib/projects";
import {
  pickNeighbors,
  pickRelated,
  type RelatedReason,
} from "@/lib/related";
import {
  TOPICS,
  countTopics,
  isTopicKey,
  topicTags,
  topicsOfTags,
  type TopicKey,
} from "@/lib/topics";

export type SafeLogFilter = {
  project?: string;
  tag?: string;
  // 主题 key（见 src/lib/topics.ts）：与 tag 同一层 AND；非法 key 在 buildLogWhere 里忽略
  topic?: string;
  // Step 3：给了 handle 先解析成 userId 注入 where（项目详情页用它挡住同名 slug 的跨租户日志）；
  // 不给维持全局大厅口径（裁定 ①：/logs 是全站公共大厅，严格 isPublished）
  handle?: string;
};

const projectSelect = {
  select: { name: true, slug: true, kind: true, status: true },
} as const;

// 列表/搜索的默认页大小。查询层与将来的页面分页共用这一个值，避免页面与查询各写一套。
export const LOG_PAGE_SIZE = 50;

// handle → userId 的异步解析单独放这里：where 构造保持同步纯函数，
// 三个查询（getSafeLogs / getLogList / getLogFacets）都走同一条解析路径。
type ResolvedLogFilter = {
  userId?: string | null;
  project?: string;
  tag?: string;
  topic?: string;
  // 列表/聚合口径要跳过无主行（历史遗留），与 getSafeLogs 的内存过滤保持同一可见集合
  requireOwner?: boolean;
};

async function resolveLogFilter(filter: SafeLogFilter): Promise<ResolvedLogFilter | null> {
  if (!filter.handle) {
    return { project: filter.project, tag: filter.tag, topic: filter.topic };
  }

  const userId = await resolveUserId(filter.handle);

  if (!userId) {
    return null;
  }

  return {
    userId,
    project: filter.project,
    tag: filter.tag,
    topic: filter.topic,
  };
}

// 公开可见口径的唯一构造点（D10）：isPublished 恒定，其余条件按传入收窄。
// 新增查询必须调这个函数，不得另写 where——漏一处就可能让草稿进前台。
function buildLogWhere(params: ResolvedLogFilter): Prisma.LogWhereInput {
  const topic = params.topic && isTopicKey(params.topic) ? params.topic : null;

  // StringNullableListFilter 一次只接受一个参数（has / hasSome 二选一），
  // 同时按单标签与主题筛选时必须拆成两个条件再用 AND 合并
  const tagConditions: Prisma.LogWhereInput[] = [];

  if (params.tag) {
    tagConditions.push({ tags: { has: params.tag } });
  }

  if (topic) {
    tagConditions.push({ tags: { hasSome: [...topicTags(topic)] } });
  }

  return {
    isPublished: true,
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.project ? { project: { slug: params.project } } : {}),
    ...(tagConditions.length > 0 ? { AND: tagConditions } : {}),
    // 无主行前台从不展示：getSafeLogs 在内存里跳过，列表/聚合直接在这里排除
    ...(params.requireOwner ? { user: { isNot: null } } : {}),
  };
}

export async function getSafeLogs(filter: SafeLogFilter = {}) {
  const resolved = await resolveLogFilter(filter);

  if (!resolved) {
    return [];
  }

  const rows = await db.log.findMany({
    where: buildLogWhere(resolved),
    orderBy: { beforeDate: "desc" },
    // 大厅行要拼 /u/[handle]/logs/[slug] 的跳转链接，owner 的 handle 属于公开标识，随 select 白名单带出
    include: { project: projectSelect, user: { select: { handle: true } } },
  });

  // 可选关系的 include 类型是 user|null：回填后本不该有无主行（有则异常），前台不展示——
  // 局部变量先收窄再展开（TS 不对交叉类型做属性访问收窄，filter 谓词同理），
  // 调用方拿 log.user.handle 不需要非空断言
  type OwnedLog = (typeof rows)[number] & { user: { handle: string } };
  const owned: OwnedLog[] = [];
  for (const log of rows) {
    const user = log.user;
    if (!user) continue;
    owned.push({ ...log, user });
  }
  return owned;
}

// 全局搜索（V2.1）：大厅为公域广场（甲口径），isPublished 恒定、不做租户收窄；
// 租户视图如需搜索，沿用 handle→userId 的既有口径（filter 形状与 getSafeLogs 一致）。
// 匹配逻辑在内存层完成（大厅本就全量加载已发布日志），tags 子串是 Prisma 数组过滤做不到的
export async function searchLogs(filter: SafeLogFilter & { q?: string }) {
  const base = await getSafeLogs(filter);
  const q = filter.q?.trim();

  if (!q) return base;

  return base.filter((log) => matchLog(log, q));
}

const logListSelect = {
  id: true,
  title: true,
  slug: true,
  tags: true,
  beforeDate: true,
  afterDate: true,
  publishedAt: true,
  project: { select: { name: true, slug: true, kind: true, status: true } },
  user: { select: { handle: true } },
} as const;

export type LogListItem = Prisma.LogGetPayload<{ select: typeof logListSelect }> & {
  user: { handle: string };
};

export type LogListPage = { items: LogListItem[]; nextCursor: string | null };

/**
 * 大厅列表查询（O1）：只取列表需要的列，不取 beforeContent/afterContent。
 * 调用方：下一步的 /logs 页面接入；本轮无调用方。
 * 分页：id 游标（orderBy beforeDate desc, id desc 保证稳定），多取一条判断是否还有下一页。
 */
export async function getLogList(
  params: SafeLogFilter & { cursor?: string | null; take?: number } = {},
): Promise<LogListPage> {
  const resolved = await resolveLogFilter(params);

  if (!resolved) {
    return { items: [], nextCursor: null };
  }

  const take = Math.min(Math.max(params.take ?? LOG_PAGE_SIZE, 1), LOG_PAGE_SIZE);
  const rows = await db.log.findMany({
    where: buildLogWhere({ ...resolved, requireOwner: true }),
    // beforeDate 可重复，故加 id 做二级游标，避免同刻日志跳条或重复。
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: logListSelect,
  });

  // where 已带 user isNot null，这里收窄只为类型（运行时不存在无主行）
  const items = rows.slice(0, take) as LogListItem[];
  const nextCursor = rows.length > take ? items[items.length - 1]?.id ?? null : null;

  return { items, nextCursor };
}

/**
 * 限量搜索（O1 查询层，保真 F24 的四字段子串语义）。
 * - title / beforeContent / afterContent：Prisma `contains` + `mode: "insensitive"`；
 * - tags 是 String[]，Prisma 只支持元素级精确匹配，子串必须落到原生 SQL 的
 *   array_to_string(tags, ' ') ILIKE；pattern 经 escapeLikePattern 转义 \ % _，
 *   并以 `Prisma.sql` 参数化传入（不做字符串拼接）。
 * - 原生 SQL 的 tags 分支无法与 Prisma 的 OR 写进同一条查询，故拆两步：先取 tags 命中的 id，
 *   再把 id 作为 OR 的一支并入最终查询；基础可见性仍只由 buildLogWhere 提供（不在 SQL 里重写条件）。
 * - 上限 50（LOG_PAGE_SIZE）与列表一致，避免搜索把整库正文拉回内存。
 * 调用方：下一步的 /logs 页面接入；本轮无调用方。
 */
export async function searchLogsLimited(
  params: SafeLogFilter & { q: string; cursor?: string | null; take?: number },
): Promise<LogListPage> {
  const resolved = await resolveLogFilter(params);

  if (!resolved) {
    return { items: [], nextCursor: null };
  }

  const q = params.q.trim();

  if (!q) {
    return { items: [], nextCursor: null };
  }

  const take = Math.min(Math.max(params.take ?? LOG_PAGE_SIZE, 1), LOG_PAGE_SIZE);
  // LIKE 的 % _ \ 必须转义；pattern 作为参数传给原生 SQL，不拼字符串
  const pattern = `%${escapeLikePattern(q)}%`;
  const tagHits = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Log"
    WHERE "isPublished" = true
      AND array_to_string("tags", ' ') ILIKE ${pattern} ESCAPE '\\'
  `);
  const tagIds = tagHits.map((row) => row.id);

  const rows = await db.log.findMany({
    where: {
      AND: [
        buildLogWhere({ ...resolved, requireOwner: true }),
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { beforeContent: { contains: q, mode: "insensitive" } },
            { afterContent: { contains: q, mode: "insensitive" } },
            ...(tagIds.length > 0 ? [{ id: { in: tagIds } }] : []),
          ],
        },
      ],
    },
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: logListSelect,
  });

  // where 已带 user isNot null，这里收窄只为类型（运行时不存在无主行）
  const items = rows.slice(0, take) as LogListItem[];
  const nextCursor = rows.length > take ? items[items.length - 1]?.id ?? null : null;

  return { items, nextCursor };
}

export type LogFacets = {
  projects: { slug: string; name: string; count: number }[];
  tags: string[];
  topics: { key: TopicKey; label: string; count: number }[];
};

/**
 * 大厅筛选项（O2）：只取 tags 与 project 两列，不碰正文。
 * 调用方：/logs 页面。
 * 排序固定（项目按名称、标签按拼音），保证同一数据每次渲染顺序一致。
 * B1 起在同一次查询的返回行上派生计数：项目计数与主题计数不额外查库。
 */
export async function getLogFacets(): Promise<LogFacets> {
  const rows = await db.log.findMany({
    where: buildLogWhere({ requireOwner: true }),
    select: { tags: true, project: { select: { slug: true, name: true } } },
  });

  const projects = new Map<string, { name: string; count: number }>();
  const tags = new Set<string>();
  const topicCounts = new Map<TopicKey, number>();

  for (const row of rows) {
    const current = projects.get(row.project.slug);
    projects.set(row.project.slug, {
      name: row.project.name,
      count: (current?.count ?? 0) + 1,
    });

    for (const tag of row.tags) tags.add(tag);

    // 一条日志在同一主题里可能有多个标签，只计一次
    for (const key of topicsOfTags(row.tags)) {
      topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    projects: [...projects]
      .map(([slug, value]) => ({ slug, name: value.name, count: value.count }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    tags: [...tags].sort((a, b) => a.localeCompare(b, "zh-CN")),
    topics: TOPICS.map((topic) => ({
      key: topic.key,
      label: topic.label,
      count: topicCounts.get(topic.key) ?? 0,
    })),
  };
}

export type LogContextItem = {
  id: string;
  title: string;
  slug: string;
  beforeDate: Date;
};

export type LogContext = {
  older: LogContextItem | null;
  newer: LogContextItem | null;
  related: LogContextItem[];
  relatedReason: RelatedReason | null;
};

/**
 * 详情页的相邻与相关（B2）：一次查询取本租户全部已发布日志的邻接所需列，
 * 前后篇与相关阅读都在内存里挑（13 条规模，不值得为此加两条 SQL）。
 * 时间序与大厅一致（beforeDate desc, id desc），保证从列表点进来时前后篇与所见顺序一致。
 */
export async function getLogContext(current: {
  id: string;
  userId: string | null;
  tags: string[];
  projectId: string;
}): Promise<LogContext> {
  // 无主行前台从不展示；类型上 userId 可空，这里提前返回，不把 null 送进 where
  if (!current.userId) {
    return { older: null, newer: null, related: [], relatedReason: null };
  }

  const rows = await db.log.findMany({
    where: { isPublished: true, userId: current.userId },
    select: {
      id: true,
      title: true,
      slug: true,
      tags: true,
      projectId: true,
      beforeDate: true,
    },
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
  });

  const { older, newer } = pickNeighbors(rows, current.id);
  // 前后篇已经在页面下方单独列出，相关阅读不再重复它们
  const excludeIds = [older?.id, newer?.id].filter(
    (id): id is string => Boolean(id),
  );
  const { items, reason } = pickRelated(rows, current, 3, excludeIds);

  return { older, newer, related: items, relatedReason: reason };
}

export type TopicCount = {
  key: TopicKey;
  label: string;
  count: number;
};

/**
 * 首页「按主题」的计数（B 阶段补充）：只取已发布日志的 tags 一列，
 * 与大厅的 getLogFacets 分开——首页不需要项目/标签全集，少算一点。
 * 一条日志在同一主题里只计一次，口径见 topics.ts 的 countTopics。
 */
export async function getTopicCounts(): Promise<TopicCount[]> {
  const rows = await db.log.findMany({
    where: { isPublished: true, user: { isNot: null } },
    select: { tags: true },
  });

  const counts = countTopics(rows.map((row) => row.tags));

  return TOPICS.map((topic) => ({
    key: topic.key,
    label: topic.label,
    count: counts.get(topic.key) ?? 0,
  }));
}

// 首页「最新日志」口径：beforeDate 是"哪天做的决策"，publishedAt 才是"什么时候写出来的"，
// 访客在这里要读最新动态，所以按发布时间排——BEFORE 填几天前都不影响它顶到最前（D13 修订）
export async function getLatestLogs(take: number, userId?: string) {
  const rows = await db.log.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isPublished: true,
      publishedAt: { not: null },
    },
    // 实测 11 篇批量入库里有 10 篇 publishedAt 完全相同（同一秒），
    // 只按它排序时前三条会退化成不确定子集，再用 beforeDate 兜底成确定顺序
    orderBy: [{ publishedAt: "desc" }, { beforeDate: "desc" }],
    take,
    include: { project: projectSelect, user: { select: { handle: true } } },
  });

  // 同 getSafeLogs：无主行跳过，局部变量收窄后展开
  type OwnedLog = (typeof rows)[number] & { user: { handle: string } };
  const owned: OwnedLog[] = [];
  for (const log of rows) {
    const user = log.user;
    if (!user) continue;
    owned.push({ ...log, user });
  }
  return owned;
}

export async function getSafeLogBySlug(slug: string, handle: string) {
  // V2.0 Step 3：handle 由路由传入（/u/[handle]/logs/[slug]），默认参数已移除
  const userId = await resolveUserId(handle);

  if (!userId) {
    return null;
  }

  return db.log.findFirst({
    // findFirst 的 where 只收字面字段：复合唯一键名（userId_slug）在 findUnique/upsert 里可用，
    // 这里用 userId+slug 两字段同样命中 @@unique 索引（isPublished 只做草稿隔离）
    where: { userId, slug, isPublished: true },
    include: { project: projectSelect },
  });
}

// Proxy 前置判定只关心命中与否，Select id 让这次查询停留在索引层面
export async function isPublishedLogSlug(slug: string, handle: string) {
  const userId = await resolveUserId(handle);

  if (!userId) {
    return false;
  }

  const hit = await db.log.findFirst({
    where: { userId, slug, isPublished: true },
    select: { id: true },
  });

  return hit !== null;
}

// 标签聚合页 proxy 前置判定（F26）：标签是否有已发布日志。
// 入参约定为已过 normalizeTag 的合法值（调用方负责归一化）；select id 让查询停留在索引层，与 isPublishedLogSlug 同构
export async function hasPublishedTag(tag: string): Promise<boolean> {
  const hit = await db.log.findFirst({
    where: { isPublished: true, tags: { has: tag } },
    select: { id: true },
  });

  return hit !== null;
}

export async function getAdminLogById(id: string, userId: string) {
  return db.log.findFirst({
    where: { id, userId },
    include: {
      project: { select: { name: true } },
      user: { select: { handle: true } },
    },
  });
}

export type AdminLogStatus = "all" | "draft" | "published";

export type AdminLogListParams = {
  status?: AdminLogStatus;
  q?: string;
  page?: number;
  pageSize?: number;
};

/**
 * 后台日志列表（Phase C）：按状态与标题筛选，页码分页（10 条/页）。
 * 与前台不同，这里必须看到草稿；userId 恒定，跨租户与不存在同表现。
 * 只取列表列，正文留给编辑页。
 */
export async function getAdminLogList(
  userId: string,
  params: AdminLogListParams = {},
) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 10, 1), 50);
  const page = Math.max(params.page ?? 1, 1);
  const q = params.q?.trim();

  const where: Prisma.LogWhereInput = {
    userId,
    ...(params.status === "draft"
      ? { isPublished: false }
      : params.status === "published"
        ? { isPublished: true }
        : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const [items, total, all, published, draft] = await Promise.all([
    db.log.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
        project: { select: { name: true } },
        user: { select: { handle: true } },
      },
    }),
    db.log.count({ where }),
    db.log.count({ where: { userId } }),
    db.log.count({ where: { userId, isPublished: true } }),
    db.log.count({ where: { userId, isPublished: false } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    counts: { all, published, draft },
  };
}

