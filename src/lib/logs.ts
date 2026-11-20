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
 * - 2026-11-13: 查询去重（本轮升级）：getSafeLogBySlug 用 React cache() 包一层——
 *               generateMetadata 与页面组件都会调它，未包时一个 URL 查两遍库；cache 只在单次请求内生效
 * - 2026-11-13: 性能预算实测后的修正：handle 不再先 resolveUserId 查一次 User，直接在 where 里用关系过滤
 *               （user: { handle }）——实测详情页页面侧 4 条 SQL，其中 1 条是这条多余的租户解析；
 *               改用关系过滤后为 3 条（Trace / Project / 上下文字表），对齐 AGENTS 的 ≤3 预算
 * - 2026-11-16: B4：新增 getTagIndex（/tags 索引页的唯一取数口）——只取 tags 一列，
 *               按显示名聚合计数，排序固定「频次降序 → 名称升序」；不做 tagsKey 双轨迁移
 * - 2026-11-16: B4：新增 getArchive（/archive 归档页）——只取列表列，按 beforeDate 分年/月，
 *               排序固定「年降序 → 月降序 → 日降序」，时间全部按 UTC 切片（与全站存时口径一致）
 * - 2026-11-16: 大厅排序切换：getLogList / searchLogsLimited 新增 sort（decided | published），
 *               orderBy 收成一个内部单源；published 口径把 publishedAt 为 null 的排到最后，
 *               游标仍用 id，两种排序下分页都稳定
 * - 2026-11-16: B4：新增 getTagFeedItems（/tags/[tag]/feed.xml 取数口）——同标签下最新 20 篇已发布，
 *               只取 feed 需要的列（标题/链接/发布时间/摘要/标签），不取全文
 * - 2026-11-16: 评审 G1：getLogContext 额外返回 catalog（本租户已发布日志的 slug + 标题）——
 *               内链目标解析复用这次已有查询，详情页 Prisma 调用仍为 2，不因内链抬高预算
 * - 2026-11-16: 评审 A2（排序部分）：getAdminLogList 新增 sort（updated / oldest / title），
 *               排序全部带 id 作次键——同一时间戳的行在翻页时不因顺序不定而错位
 * - 2026-11-16: V3.1 G2：新增 getSeriesLogs / hasPublishedSeries / listSeriesNames（系列页、Proxy 404、编辑器联想）
 * - 2026-11-16: G1 第二刀：新增 getLogBacklinks——同作者已发布正文里出现 `[[slug]]` 的反向引用；
 *               由 `content contains` 一次查询承担，详情页 Prisma 调用 2→3（裁定见评审第十九节）
 * - 2026-11-19: V5 Phase 6 O1：searchLogsLimited 的 tags 裸 SQL 表名 Trace→Log——@@map("Log") 下物理表名
 *               仍是 Log，V5 Phase 1 的 db.log→db.trace 机械替换误改裸 SQL，导致 /api/search 500
 */
import { Prisma } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  groupArchive,
  type ArchiveEntry,
  type ArchiveYear,
} from "@/lib/archive";
import { escapeLikePattern, matchLog } from "@/lib/log-search";
import { resolveUserId } from "@/lib/projects";
import { seriesProgress, type SeriesInfo } from "@/lib/series";
import type { AdminLogSort } from "@/lib/sort-preference";
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
  select: { name: true, slug: true, kind: true, status: true, repoUrl: true },
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
function buildLogWhere(params: ResolvedLogFilter): Prisma.TraceWhereInput {
  const topic = params.topic && isTopicKey(params.topic) ? params.topic : null;

  // StringNullableListFilter 一次只接受一个参数（has / hasSome 二选一），
  // 同时按单标签与主题筛选时必须拆成两个条件再用 AND 合并
  const tagConditions: Prisma.TraceWhereInput[] = [];

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

  const rows = await db.trace.findMany({
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
  lessonLearned: true,
  beforeDate: true,
  afterDate: true,
  publishedAt: true,
  project: { select: { name: true, slug: true, kind: true, status: true } },
  user: { select: { handle: true } },
} as const;

export type LogListItem = Prisma.TraceGetPayload<{ select: typeof logListSelect }> & {
  user: { handle: string };
};

export type LogListPage = { items: LogListItem[]; nextCursor: string | null };

/**
 * 大厅列表查询（O1）：只取列表需要的列，不取 beforeContent/afterContent。
 * 调用方：下一步的 /logs 页面接入；本轮无调用方。
 * 分页：id 游标（orderBy beforeDate desc, id desc 保证稳定），多取一条判断是否还有下一页。
 */
export type LogSort = "decided" | "published";

// 列表排序单源：decided = 按“哪天做的决策”（beforeDate），published = 按“什么时候写出来”（publishedAt）。
// 两种都带 id 做二级键，保证游标分页稳定；publishedAt 可空，null 一律排最后
function logOrderBy(sort?: LogSort) {
  return sort === "published"
    ? [
        { publishedAt: { sort: "desc" as const, nulls: "last" as const } },
        { id: "desc" as const },
      ]
    : [{ beforeDate: "desc" as const }, { id: "desc" as const }];
}

export async function getLogList(
  params: SafeLogFilter & {
    cursor?: string | null;
    take?: number;
    sort?: LogSort;
  } = {},
): Promise<LogListPage> {
  const resolved = await resolveLogFilter(params);

  if (!resolved) {
    return { items: [], nextCursor: null };
  }

  const take = Math.min(Math.max(params.take ?? LOG_PAGE_SIZE, 1), LOG_PAGE_SIZE);
  const rows = await db.trace.findMany({
    where: buildLogWhere({ ...resolved, requireOwner: true }),
    // beforeDate 可重复，故加 id 做二级游标，避免同刻日志跳条或重复；published 口径同理
    orderBy: logOrderBy(params.sort),
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
  params: SafeLogFilter & {
    q: string;
    cursor?: string | null;
    take?: number;
    sort?: LogSort;
  },
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
  // 裸 SQL 写物理表名（@@map("Log")）：Prisma 客户端用 db.trace，但物理表叫 Log。
  // V5 Phase 1 的 db.log→db.trace 机械替换曾把这里也改成 "Trace"，/api/search 即 500。
  const tagHits = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Log"
    WHERE "isPublished" = true
      AND array_to_string("tags", ' ') ILIKE ${pattern} ESCAPE '\\'
  `);
  const tagIds = tagHits.map((row) => row.id);

  const rows = await db.trace.findMany({
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
    orderBy: logOrderBy(params.sort),
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
  const rows = await db.trace.findMany({
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

// 分组规则抽到 src/lib/archive.ts 的纯函数（可用 node --test 钉住）；这里只做类型再导出，页面引用路径不变
export type {
  ArchiveEntry,
  ArchiveMonth,
  ArchiveYear,
} from "@/lib/archive";

/**
 * 归档页（/archive）的唯一取数口：只取列表需要的列，不取正文。
 * 分组按 beforeDate（“哪天做的决策”）而不是 publishedAt——归档回答“什么时候发生”，
 * 与大厅的时间序一致；年份/月份按 UTC 切片，与全库存时口径一致，不在展示层做本地时区换算。
 */
export async function getArchive(): Promise<ArchiveYear[]> {
  const rows = await db.trace.findMany({
    where: buildLogWhere({ requireOwner: true }),
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      beforeDate: true,
      project: { select: { name: true } },
      user: { select: { handle: true } },
    },
  });

  const entries: ArchiveEntry[] = [];

  for (const row of rows) {
    // 无主行前台从不展示（buildLogWhere 已过滤，这里仅为类型收窄）
    if (!row.user) continue;

    entries.push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      handle: row.user.handle,
      projectName: row.project.name,
      beforeDate: row.beforeDate,
    });
  }

  // 分组与排序规则在纯函数里（年降序 → 月降序 → 日内保持查询顺序）
  return groupArchive(entries);
}

export type TagFeedItem = {
  title: string;
  slug: string;
  handle: string;
  publishedAt: Date;
  summary: string;
  tags: string[];
};

/**
 * 标签订阅源（/tags/[tag]/feed.xml）的取数口：同标签下最新 N 篇已发布日志。
 * 只取 feed 需要的列（不取全文），publishedAt 为空的跳过——订阅源不出现“从未发布”的条目。
 */
export async function getTagFeedItems(
  tag: string,
  take = 20,
): Promise<TagFeedItem[]> {
  const rows = await db.trace.findMany({
    where: buildLogWhere({ tag, requireOwner: true }),
    orderBy: [
      { publishedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ],
    take,
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      lessonLearned: true,
      beforeContent: true,
      tags: true,
      user: { select: { handle: true } },
    },
  });

  const items: TagFeedItem[] = [];

  for (const row of rows) {
    if (!row.user || !row.publishedAt) continue;

    items.push({
      title: row.title,
      slug: row.slug,
      handle: row.user.handle,
      publishedAt: row.publishedAt,
      // 摘要口径与全站 feed / 详情页一致：经验总结优先，缺则取 BEFORE 正文
      summary: row.lessonLearned?.trim() || row.beforeContent,
      tags: row.tags,
    });
  }

  return items;
}

export type TagIndexEntry = { tag: string; count: number };/**
 * 标签索引页（/tags）的唯一取数口：只取 tags 一列，按显示名聚合计数。
 * 排序固定「频次降序 → 名称升序（zh-CN）」，保证同一份数据每次渲染顺序一致。
 * 口径与大厅一致（isPublished + 有主行），不做 tagsKey 双轨（标签归一化留给 B4 迁移批）。
 */
export async function getTagIndex(): Promise<TagIndexEntry[]> {
  const rows = await db.trace.findMany({
    where: buildLogWhere({ requireOwner: true }),
    select: { tags: true },
  });

  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
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
  // 正文内链（G1）的目标表：slug → 标题，只含已发布日志；页面据此决定渲染为链接还是保留原文
  catalog: { slug: string; title: string }[];
  // 系列进度（G2）：同一次查询的行集里算，不另发 SQL；没系列或未命中为 null
  seriesInfo: SeriesInfo | null;
};

/**
 * 详情页的相邻与相关（B2）：一次查询取本租户全部已发布日志的邻接所需列，
 * 前后篇与相关阅读都在内存里挑（13 条规模，不值得为此加两条 SQL）。
 * 时间序与大厅一致（beforeDate desc, id desc），保证从列表点进来时前后篇与所见顺序一致。
 */
export async function getLogContext(current: {
  id: string;
  slug: string;
  userId: string | null;
  tags: string[];
  projectId: string;
  series: string | null;
}): Promise<LogContext> {
  // 无主行前台从不展示；类型上 userId 可空，这里提前返回，不把 null 送进 where
  if (!current.userId) {
    return {
      older: null,
      newer: null,
      related: [],
      relatedReason: null,
      catalog: [],
      seriesInfo: null,
    };
  }

  const rows = await db.trace.findMany({
    where: { isPublished: true, userId: current.userId },
    select: {
      id: true,
      title: true,
      slug: true,
      tags: true,
      projectId: true,
      beforeDate: true,
      series: true,
    },
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
  });

  const { older, newer } = pickNeighbors(rows, current.id);
  // 前后篇已经在页面下方单独列出，相关阅读不再重复它们
  const excludeIds = [older?.id, newer?.id].filter(
    (id): id is string => Boolean(id),
  );
  const { items, reason } = pickRelated(rows, current, 3, excludeIds);

  return {
    older,
    newer,
    related: items,
    relatedReason: reason,
    // 同一批 rows 已经在内存里：给 G1 一份 slug → 标题的表，G2 的系列进度也从这里算，不额外查库
    catalog: rows.map(({ slug, title }) => ({ slug, title })),
    seriesInfo: seriesProgress(rows, current.slug),
  };
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
  const rows = await db.trace.findMany({
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
  const rows = await db.trace.findMany({
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

export const getSafeLogBySlug = cache(async (slug: string, handle: string) => {
  // handle 直接用关系过滤写进 where：不再先查一次 User 拿 userId（实测那是一次多余的往返），
  // 未知 handle 与 slug 不存在同样返回 null，口径不变
  return db.trace.findFirst({
    // user 关系过滤走 User.handle 唯一索引，Trace 侧仍命中 @@unique([userId, slug]) 的前缀
    where: { slug, isPublished: true, user: { handle } },
    include: { project: projectSelect },
  });
});

// Proxy 前置判定只关心命中与否，Select id 让这次查询停留在索引层面；
// handle 直接用关系过滤（与 getSafeLogBySlug 同口径），不再先用一次 User 查询换 userId
// ——Proxy 在每次详情请求上都跑，省下的是每请求一次来回
export async function isPublishedLogSlug(slug: string, handle: string) {
  const hit = await db.trace.findFirst({
    where: { slug, isPublished: true, user: { handle } },
    select: { id: true },
  });

  return hit !== null;
}

// V5 Phase 1 版本核验查询（前台口径，isPublished 恒定 true；草稿与未发布内容永不返回）：
// 详情页 ?v=N 版本切换器、/verify 按哈希反查都走这三条

// 版本切换器用的版本清单：只取索引列，不取正文
export async function listPublishedVersions(slug: string, handle: string) {
  const log = await db.trace.findFirst({
    where: { slug, isPublished: true, user: { handle } },
    select: { id: true },
  });

  if (!log) return null;

  return db.traceRevision.findMany({
    where: { traceId: log.id },
    orderBy: [{ version: "desc" }, { id: "desc" }],
    select: { version: true, contentHash: true, publishedAt: true, gitSha: true },
  });
}

// 按版本号取单个已发布版本（?v=N 渲染与核验信息用）
export async function getPublishedRevisionByVersion(
  slug: string,
  handle: string,
  version: number,
) {
  return db.trace.findFirst({
    where: { slug, isPublished: true, user: { handle }, revisions: { some: { version } } },
    select: {
      slug: true,
      title: true,
      beforeContent: true,
      afterContent: true,
      tags: true,
      contentHash: true,
      hashVersion: true,
      publishedAt: true,
      revisions: {
        where: { version },
        select: {
          version: true,
          hashVersion: true,
          gitSha: true,
          gitTag: true,
          verdictAtPublish: true,
          title: true,
          beforeContent: true,
          afterContent: true,
          tags: true,
          contentHash: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

// /verify 按哈希反查：只命中已发布版本；草稿命中但不公开时同样返回 null，不泄露存在性
export async function getPublishedRevisionByHash(hash: string) {
  return db.traceRevision.findFirst({
    where: { contentHash: hash, trace: { isPublished: true } },
    select: {
      version: true,
      hashVersion: true,
      gitSha: true,
      gitTag: true,
      title: true,
      beforeContent: true,
      afterContent: true,
      contentHash: true,
      publishedAt: true,
      trace: { select: { slug: true, title: true } },
    },
  });
}

// 标签聚合页 proxy 前置判定（F26）：标签是否有已发布日志。
// 入参约定为已过 normalizeTag 的合法值（调用方负责归一化）；select id 让查询停留在索引层，与 isPublishedLogSlug 同构
export async function hasPublishedTag(tag: string): Promise<boolean> {
  const hit = await db.trace.findFirst({
    where: { isPublished: true, tags: { has: tag } },
    select: { id: true },
  });

  return hit !== null;
}

/**
 * 系列名清单（V3.1 G2 补）：编辑器用 <datalist> 提示已有系列，避免手打错一个字符就裂成两个系列。
 * 只取本租户的 series 列（去重、按名称排序），不取日志正文。
 */
export async function listSeriesNames(userId: string): Promise<string[]> {
  const [entities, legacy] = await Promise.all([
    db.series.findMany({ where: { userId }, select: { name: true } }),
    db.trace.findMany({
      where: { userId, series: { not: null }, seriesId: null },
      select: { series: true },
      distinct: ["series"],
    }),
  ]);

  return [...new Set([
    ...entities.map((row) => row.name),
    ...legacy.flatMap((row) => (row.series ? [row.series] : [])),
  ])].sort((a, b) => a.localeCompare(b));
}

/**
 * 系列索引（V3.1 G2 补）：某租户下所有已发布系列 + 篇数，按名称升序。
 * 只取 series 一列做 groupBy，不碰正文；空租户返回空数组，由页面/Proxy 判定不存在。
 */
export type SeriesIndexEntry = { name: string; count: number };

export async function getSeriesIndex(handle: string): Promise<SeriesIndexEntry[]> {
  const [entities, legacy] = await Promise.all([
    db.series.findMany({
      where: { user: { handle }, traces: { some: { isPublished: true } } },
      select: {
        name: true,
        traces: { where: { isPublished: true }, select: { id: true } },
      },
    }),
    db.trace.groupBy({
      by: ["series"],
      where: {
        isPublished: true,
        series: { not: null },
        seriesId: null,
        user: { handle },
      },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const entity of entities) {
    counts.set(entity.name, entity.traces.length);
  }
  for (const row of legacy) {
    if (!row.series) continue;
    counts.set(row.series, (counts.get(row.series) ?? 0) + row._count._all);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Proxy 前置判定：该 handle 下是否至少有一个已发布系列（系列索引页用）
export async function hasAnyPublishedSeries(handle: string) {
  const [entity, legacy] = await Promise.all([
    db.series.findFirst({
      where: { user: { handle }, traces: { some: { isPublished: true } } },
      select: { id: true },
    }),
    db.trace.findFirst({
      where: { isPublished: true, series: { not: null }, seriesId: null, user: { handle } },
      select: { id: true },
    }),
  ]);

  return entity !== null || legacy !== null;
}

/**
 * 系列页取数（V3.1 / G2）：同一作者、同一个系列名的已发布日志，按决策时间升序。
 * 不建系列表——同名即同系列；空结果由页面/Proxy 判定为不存在。
 */
export async function getSeriesLogs(series: string, handle: string) {
  return db.trace.findMany({
    where: {
      isPublished: true,
      user: { handle },
      OR: [
        { seriesRef: { is: { name: series } } },
        { series, seriesId: null },
      ],
    },
    orderBy: [{ beforeDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      beforeDate: true,
      project: { select: { name: true } },
    },
  });
}

// Proxy 前置判定：该 handle 下是否存在名为 series 的已发布系列
// （层一 handle 不存在也回 false；与日志/项目/标签同一口径，不泄露缺的是哪一层）
export async function hasPublishedSeries(series: string, handle: string) {
  const hit = await db.trace.findFirst({
    where: {
      isPublished: true,
      user: { handle },
      OR: [
        { seriesRef: { is: { name: series } } },
        { series, seriesId: null },
      ],
    },
    select: { id: true },
  });

  return hit !== null;
}

export type BacklinkItem = {
  id: string;
  slug: string;
  title: string;
  beforeDate: Date;
};

/**
 * 反向引用（G1 第二刀）：同作者已发布日志里，正文出现 `[[slug]]` 的那些。
 * 用 contains 而不是全文索引：当前量级（数十条）一个 ILIKE 足够，建索引/预计算表反而是新复杂度。
 * marker 里的方括号是字面量，slug 不含 LIKE 通配符，无需转义。
 */
export async function getLogBacklinks(opts: {
  userId: string | null;
  slug: string;
  take?: number;
}): Promise<BacklinkItem[]> {
  if (!opts.userId) {
    return [];
  }

  const marker = `[[${opts.slug}]]`;
  const take = Math.min(Math.max(opts.take ?? 10, 1), 20);

  return db.trace.findMany({
    where: {
      userId: opts.userId,
      isPublished: true,
      slug: { not: opts.slug },
      OR: [
        { beforeContent: { contains: marker } },
        { afterContent: { contains: marker } },
        { lessonLearned: { contains: marker } },
      ],
    },
    orderBy: [{ beforeDate: "desc" }, { id: "desc" }],
    take,
    select: { id: true, slug: true, title: true, beforeDate: true },
  });
}

export async function getAdminLogById(id: string, userId: string) {
  return db.trace.findFirst({
    where: { id, userId },
    include: {
      project: { select: { name: true } },
      user: { select: { handle: true } },
    },
  });
}

/**
 * 修订历史页取数：一条轨迹 + 全部版本行（V5 Phase 1：版本行永不删除，不再限 20 条）。
 * 与 getAdminLogById 同一租户条件；不存在与跨租户同返回 null。
 * 按版本号倒序，附带 version/hashVersion/git 锚定状态供历史页展示与重试。
 */
export async function getLogRevisions(id: string, userId: string) {
  return db.trace.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      beforeContent: true,
      afterContent: true,
      tags: true,
      contentHash: true,
      publishedAt: true,
      revisions: {
        orderBy: [{ version: "desc" }, { id: "desc" }],
        select: {
          id: true,
          version: true,
          hashVersion: true,
          gitSha: true,
          gitTag: true,
          gitSyncedAt: true,
          verdictAtPublish: true,
          title: true,
          beforeContent: true,
          afterContent: true,
          tags: true,
          contentHash: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export type AdminLogStatus = "all" | "draft" | "published";

export type AdminLogListParams = {
  status?: AdminLogStatus;
  q?: string;
  // 按项目 slug 筛选（2026-11-16 评审 A3）；不传即全部项目
  project?: string;
  // 排序（2026-11-16 评审 A2）：最近更新 / 最早更新 / 标题；不传即最近更新
  sort?: AdminLogSort;
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

  const where: Prisma.TraceWhereInput = {
    userId,
    ...(params.status === "draft"
      ? { isPublished: false }
      : params.status === "published"
        ? { isPublished: true }
        : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    // 项目 slug 是客户端可控值：用关系过滤，不存在的 slug 自然得到空集（不抛错）
    ...(params.project ? { project: { slug: params.project } } : {}),
  };

  const [items, total, all, published, draft] = await Promise.all([
    db.trace.findMany({
      where,
      orderBy:
        params.sort === "title"
          ? [{ title: "asc" }, { id: "asc" }]
          : params.sort === "oldest"
            ? [{ updatedAt: "asc" }, { id: "asc" }]
            : [{ updatedAt: "desc" }, { id: "desc" }],
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
    db.trace.count({ where }),
    db.trace.count({ where: { userId } }),
    db.trace.count({ where: { userId, isPublished: true } }),
    db.trace.count({ where: { userId, isPublished: false } }),
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

