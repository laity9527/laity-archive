/**
 * 文件：src/app/admin/logs/[id]/edit/page.tsx
 * 描述：编辑日志：回填全部字段、保存即退回草稿、发布时写哈希与服务器时间
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供
 * - 2026-11-02: 已发布状态下增"下架"动作与 UNPUBLISHED 提示（补 SPEC:117 的 unpublishLog）
 * - 2026-11-03: 发布前展示敏感信息命中清单并要求勾选确认；新增"彻底删除"（回填 slug 确认）
 * - 2026-11-04: 保存/发布/下架/彻底删除四个按钮改用 SubmitButton，提交中禁用并换文案
 * - 2026-11-04: 发布不再是独立小表单（D25）：改成"保存并发布"按钮挂在同一张表单上（per-button formAction），
 * - 2026-11-04: 状态横幅补 role=alert、确认删除输入框补可访问名、勾选行改 items-center（D27）
 *               发布前核对面板也移进表单、排在按钮之前——原先改了正文不点保存直接发布，发出去的是库里旧内容
 * - 2026-11-06: 第三批去英文——六个表单标签（TITLE/SLUG/PROJECT/TAGS/BEFORE DATE/AFTER DATE）中文化并走 font-sans；
 *               四条状态横幅去掉 SAVED/PUBLISHED/UNPUBLISHED 英文前缀；● 已发布 / ○ 草稿、上次发布与内容摘要两行
 *               标签走 sans、时刻与哈希留 mono。BEFORE/AFTER 术语与 LOG_002 等错误码 chip 未动
 * - 2026-11-06: 第二批去英文（按负责人"全局搜索 LESSON LEARNED 并一并中文化"的指令扩到本页）：
 *               表单标签 LESSON LEARNED 改「经验总结」并走 font-sans；同页的 CONTENT HASH、PUBLISHED/LAST PUBLISHED 等按分工留后续，本轮未动
 * - 2026-11-09: 彻底删除按钮加 confirmMessage 原生弹窗（取消即不提交）；回填 slug 的服务端判据（LOG_004）未动
 * - 2026-11-09: V2.0 Step 4-B：取数带 session.userId（别人的日志与不存在同判 LOG_002）；
 *               项目下拉只列本租户；「看前台」链接补 Step 3 遗留——/logs/<slug> 改 /u/<handle>/logs/<slug>
 * - 2026-11-13: Phase C 编辑器：保存/发布按钮从表单底部提到顶部粘性操作条；
 *               新增「发布检查」摘要（标题 / BEFORE / 敏感扫描 / 摘要），口径仍以服务端保存时为准
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteLogAction,
  publishLogAction,
  saveLogAction,
  unpublishLogAction,
} from "@/app/admin/log-actions";
import { requireAdminSession } from "@/auth";
import { Editor } from "@/components/Editor";
import { SubmitButton } from "@/components/SubmitButton";
import { errorCodeChip, errorTextOf } from "@/lib/error-text";
import { ID_PATTERN, LIMITS, SLUG_SOURCE, pickParam } from "@/lib/forms";
import { getAdminLogById } from "@/lib/logs";
import { listProjects } from "@/lib/projects";
import { toDateTimeLocal } from "@/lib/publish";
import { scanSensitive } from "@/lib/sensitive-scan";

// 本页读会话与单条日志，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type EditLogPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string | string[];
    field?: string | string[];
    saved?: string | string[];
    published?: string | string[];
    unpublished?: string | string[];
  }>;
};

export default async function EditLogPage({
  params,
  searchParams,
}: EditLogPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireAdminSession();

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/admin/logs/${id}/edit`)}`);
  }

  const log = await getAdminLogById(id, session.userId);

  // 记录不在库里时不走 notFound()：那会落到公共 404 页，那页只给 /logs 与 /projects 两个出口，
  // 从后台点进一条已删除的日志就回不了后台。这里在后台外壳内给一块同口径的提示面板。
  if (!log) {
    // 地址里的 id 是任何人可写的段，回显前先按形状挡一道（I065）
    const shownId = ID_PATTERN.test(id) ? id : "（非法标识）";

    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-tight">编辑日志</h1>
          <Link
            href="/admin"
            className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
          >
            ← 概览
          </Link>
        </div>

        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          LOG_002 · 这条日志不存在，可能已被删除。
        </p>

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-soft">
          地址里的标识是 <span className="text-ink">{shownId}</span>
          ，库里没有对应记录。回
          <Link href="/admin" className="border-b border-ink text-ink">
            概览
          </Link>
          看现有条目，或
          <Link href="/admin/logs/new" className="border-b border-ink text-ink">
            新建一条
          </Link>
          。
        </p>
      </>
    );
  }

  const projects = await listProjects(session.userId);
  const errorCode = pickParam(query.error);
  const errorField = pickParam(query.field);
  const errorText = errorCode ? errorTextOf(errorCode, "log", errorField) : null;
  const saved = pickParam(query.saved);
  const published = pickParam(query.published);
  const unpublished = pickParam(query.unpublished);

  // 出错字段只用于把浏览器焦点标在那一个控件上；具体文案由 errorTextOf 按同一 field 取
  const bad = (field: string) => errorCode === "VAL_001" && errorField === field;

  // 扫的是库里的正文（与发布动作同一口径），所以这里显示的就是发布时会被拦的内容
  const hits = scanSensitive(
    [log.title, log.beforeContent, log.afterContent, log.lessonLearned]
      .filter(Boolean)
      .join("\n"),
  );
  const blocking = hits.filter((hit) => !hit.advisory);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight">编辑日志</h1>
        <Link
          href="/admin"
          className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
        >
          ← 概览
        </Link>
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
        <span className="text-ink">{log.isPublished ? "● 已发布" : "○ 草稿"}</span>
        {log.user && (
          <>
            <span>/u/{log.user.handle}/logs/{log.slug}</span>
            {log.isPublished && (
              <Link
                href={`/u/${log.user.handle}/logs/${log.slug}`}
                className="border-b border-ink text-ink"
              >
                看前台
              </Link>
            )}
          </>
        )}
      </p>

      {errorText && (
        <p
          id="form-error"
          role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink"
        >
          {errorCodeChip(errorCode ?? "")} · {errorText}
        </p>
      )}

      {saved && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          已保存{log.isPublished ? "" : "，当前为草稿"}
        </p>
      )}

      {published && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          已发布，前台可见
        </p>
      )}

      {unpublished && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          已下架，前台不再可见，历史摘要与发布时间保留
        </p>
      )}

      {log.contentHash && log.publishedAt && (
        <div className="mt-6 border-t border-hairline pt-4 font-mono text-[11px] leading-relaxed text-ink-soft">
          <p>
            <span className="font-sans">{`上次发布 · `}</span>
            <span>{log.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
          </p>
          <p className="break-all">
            <span className="font-sans">{`内容摘要 · `}</span>
            <span>{log.contentHash}</span>
          </p>
          {!log.isPublished && (
            <p className="mt-2">
              这份哈希对应的是上一次发布的正文；重新发布会按当前正文重算。
            </p>
          )}
        </div>
      )}

      <form action={saveLogAction} className="mt-10 grid gap-6 md:grid-cols-2">
        <input type="hidden" name="id" value={log.id} />

        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-hairline bg-paper/95 px-1 py-3 md:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton
              label="保存修改"
              pendingLabel="保存中…"
              className="border-b border-ink font-sans text-xs text-ink disabled:text-ink-soft"
            />
            {!log.isPublished && (
              <SubmitButton
                label="保存并发布"
                pendingLabel="发布中…"
                formAction={publishLogAction}
                className="border border-ink px-4 py-2 font-sans text-xs text-ink disabled:text-ink-soft"
              />
            )}
          </div>
          <span className="font-sans text-[10px] text-ink-soft">
            {log.isPublished
              ? "已发布的日志一保存就退回草稿，需要重新发布"
              : "发布 = 先保存这张表单里的内容，再按它算 SHA-256 并记服务器时间"}
          </span>
          {!log.isPublished && blocking.length > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="sensitiveConfirmed"
                className="border border-ink"
              />
              <span className="font-sans text-[11px] text-ink">
                已核对上述 {blocking.length} 类命中，仍要发布
              </span>
            </label>
          )}
        </div>

        <div className="border border-hairline px-4 py-3 md:col-span-2">
          <p className="font-sans text-[10px] text-ink-soft">
            发布检查 · 保存时口径
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-sans text-[11px] text-ink-soft">
            <li>标题 {log.title.trim() ? "✓" : "缺失"}</li>
            <li>BEFORE 正文 {log.beforeContent.trim() ? "✓" : "缺失"}</li>
            <li>
              敏感扫描{" "}
              {blocking.length === 0
                ? "0 类阻断"
                : `${blocking.length} 类阻断`}
            </li>
            <li>{log.contentHash ? "摘要将在发布时重算" : "发布时生成摘要"}</li>
          </ul>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">标题</span>
          <input
            name="title"
            defaultValue={log.title}
            required
            maxLength={LIMITS.title}
            aria-invalid={bad("title") || undefined}
            aria-describedby={bad("title") ? "form-error" : undefined}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">标识</span>
          <input
            name="slug"
            defaultValue={log.slug}
            required
            pattern={SLUG_SOURCE}
            aria-invalid={bad("slug") || undefined}
            aria-describedby={bad("slug") ? "form-error" : undefined}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">项目</span>
          <select
            name="projectId"
            defaultValue={log.projectId}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">标签（逗号分隔，可空）</span>
          <input
            name="tags"
            defaultValue={log.tags.join(", ")}
            aria-invalid={bad("tags") || undefined}
            aria-describedby={bad("tags") ? "form-error" : undefined}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">BEFORE 日期（本地时间，存库转 UTC）</span>
          <input
            type="datetime-local"
            name="beforeDate"
            defaultValue={toDateTimeLocal(log.beforeDate)}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-sans text-[10px] text-ink-soft">AFTER 日期（可空）</span>
          <input
            type="datetime-local"
            name="afterDate"
            defaultValue={toDateTimeLocal(log.afterDate)}
            className="border border-hairline bg-transparent px-3 py-2 font-mono text-sm text-ink"
          />
        </label>

        <div className="md:col-span-2">
          <Editor
            initialBefore={log.beforeContent}
            initialAfter={log.afterContent ?? ""}
            draftKey={log.id}
            restoreDraft={Boolean(errorCode)}
            initialAiAssisted={log.isAiAssisted}
          />
        </div>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="font-sans text-[10px] text-ink-soft">
            经验总结（Markdown，可空）
          </span>
          <textarea
            name="lessonLearned"
            defaultValue={log.lessonLearned ?? ""}
            maxLength={LIMITS.lesson}
            aria-invalid={bad("lessonLearned") || undefined}
            aria-describedby={bad("lessonLearned") ? "form-error" : undefined}
            rows={4}
            className="w-full border border-hairline bg-transparent px-3 py-2 font-mono text-[12px] leading-relaxed text-ink"
          />
        </label>

        {hits.length > 0 && (
          <div className="md:col-span-2 border border-ink px-4 py-3">
            <p className="font-sans text-[10px] text-ink">
              发布前核对 · 命中 {hits.length} 类形态
            </p>
            <ul className="mt-3 grid gap-1 font-sans text-[11px] leading-relaxed text-ink-soft">
              {hits.map((hit) => (
                <li key={hit.code}>
                  {hit.advisory ? "提示" : "阻截"} · {hit.label} ×{hit.count} ·{" "}
                  {hit.samples.join(" / ")}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
              这只是形态判断，会误报（示例数据、占位串都算）。阻截类请先删改；
              确认没有可撤回的公开内容时，勾选上面的确认再发布。
            </p>
          </div>
        )}
      </form>

      {log.isPublished && (
        <form
          action={unpublishLogAction}
          className="mt-8 border-t border-hairline pt-6"
        >
          <input type="hidden" name="id" value={log.id} />
          <SubmitButton
            label="下架"
            pendingLabel="下架中…"
            className="border border-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-ink disabled:text-ink-soft"
          />
          <span className="ml-6 font-mono text-[10px] text-ink-soft">
            下架 = 前台立即不可见，保留历史摘要与发布时间，正文不动
          </span>
        </form>
      )}

      <form action={deleteLogAction} className="mt-6 border-t border-hairline pt-6">
        <input type="hidden" name="id" value={log.id} />
        <p className="font-mono text-[10px] leading-relaxed text-ink-soft">
          彻底删除 = 正文、摘要与发布时间一起从库里消失，不可恢复；只是想暂时不公开请用上面的「下架」。
          正文里引用过的图片对象不会被删（那把密钥只有写入权限），由存储桶生命周期规则清理。
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <input
            name="confirmSlug"
            placeholder={`原样输入 ${log.slug}`}
            aria-label={`删除确认：原样输入这条日志的标识 ${log.slug}`}
            className="border border-ink bg-transparent px-3 py-2 font-mono text-[11px] text-ink"
          />
          <SubmitButton
            label="彻底删除"
            pendingLabel="删除中…"
            confirmMessage="确认要彻底删除吗？此操作不可恢复。"
            className="border border-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-ink disabled:text-ink-soft"
          />
        </div>
      </form>
    </>
  );
}

