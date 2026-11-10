/**
 * 文件：src/app/admin/projects/page.tsx
 * 描述：项目管理：列表（含日志数）、新建/编辑表单、PRJ_001/PRJ_002 错误提示
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 * - 2026-11-02: pickParam 与错误文案表改由 src/lib 提供，kind/status 选项取自 lib 单源常量
 * - 2026-11-04: 新建/保存与删除按钮改用 SubmitButton：提交进行中禁用，避免重复创建或重复删除
 * - 2026-11-04: 删除改两步生效（再点一次确认）、保存/删除带 ?saved=1/?deleted=1 回显、
 *               VAL_001 按 ?field= 标到具体控件（D26）
 * - 2026-11-04: REPO URL 的 pattern 改取 src/lib/forms.ts 的 REPO_URL_SOURCE：上一轮直接写 JSX 属性字符串，
 * - 2026-11-04: 三条状态横幅补 role=alert（D27）
 *               反斜杠变成两个，真实仓库地址被浏览器静默拒掉（I060）
 * - 2026-11-05: Select 加一层可选 labelMap：kind/status 下拉的 <option value> 仍是库里的英文原值（写库与校验口径不动），
 *               显示文案走 src/lib/labels.ts 的中文映射；PROJECT_KINDS / PROJECT_STATUSES 两个常量未改
 * - 2026-11-06: 第三批去英文——SAVED/DELETED 两条横幅去掉英文前缀（中文句已自解释），小节标题 EDIT/NEW PROJECT 改中文，
 *               六个 Field/Select 的 label 中文化（REPO URL 保留 URL 缩写）；Field/Select/h2 三处标签类统一走 font-sans
 * - 2026-11-06: 全站去英文第一批——列表行的 kind/status 与 LOGS 改走 labels 映射、空态 NO PROJECT YET 改「暂无项目」；
 *               slug 仍 font-mono，中文改 font-sans。状态灯的 status === "LIVE" 判定与表单取值未动
 * - 2026-11-09: 删除按钮由 confirmLabel 两步生效改 confirmMessage 原生弹窗（取消即不提交）；
 *               服务端 confirmDelete=on 闸门未动，由弹窗分支恒置 on 满足
 * - 2026-11-09: V2.0 Step 4-B：列表与编辑回填都带 session.userId——别人的项目不出现在列表里，
 *               ?edit= 传别人的 id 回填不到（getProjectById 按 {id,userId} 查），与不存在同表现
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteProjectAction, saveProjectAction } from "@/app/admin/project-actions";
import { requireAdminSession } from "@/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { errorCodeChip, errorTextOf } from "@/lib/error-text";
import { LIMITS, REPO_URL_SOURCE, SLUG_SOURCE, pickParam } from "@/lib/forms";
import { kindLabel, logsCountLabel, statusLabel } from "@/lib/labels";
import { PROJECT_KINDS, PROJECT_STATUSES, getProjectById, listProjects } from "@/lib/projects";

// 本页查库并读编辑参数，导航进来必然阻塞。instant = false 只用于退出即时导航校验；
// 它是本路由里最高的 instant 配置，因此同时豁免"静态壳非空"校验，并不改变渲染方式
export const instant = false;

type ProjectsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    field?: string | string[];
    edit?: string | string[];
    saved?: string | string[];
    deleted?: string | string[];
  }>;
};

// maxLength/pattern 让高频错误在浏览器里就提交不出去；服务端仍是唯一判据
function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  maxLength,
  pattern,
  invalid,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  invalid?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-sans text-[10px] text-ink-soft">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "form-error" : undefined}
        className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
  labelMap = (value: string) => value,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
  labelMap?: (value: string) => string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-sans text-[10px] text-ink-soft">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const errorCode = pickParam(params.error);
  const errorField = pickParam(params.field);
  const editId = pickParam(params.edit);
  const saved = pickParam(params.saved);
  const deleted = pickParam(params.deleted);
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Fprojects");
  }

  const projects = await listProjects(session.userId);
  const editing = editId ? await getProjectById(editId, session.userId) : null;
  const errorText = errorCode
    ? errorTextOf(errorCode, "project", errorField)
    : null;
  const bad = (field: string) => errorCode === "VAL_001" && errorField === field;

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">项目</h1>

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
          项目已保存
        </p>
      )}

      {deleted && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          该项目已删除
        </p>
      )}

      <ul className="mt-10 border-t border-ink">
        {projects.length === 0 && (
          <li className="border-b border-hairline py-6 font-sans text-xs text-ink-soft">
            暂无项目
          </li>
        )}
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-hairline py-4"
          >
            <span aria-hidden className="font-mono text-[10px] text-ink">
              {project.status === "LIVE" ? "●" : "○"}
            </span>
            <span className="text-base">{project.name}</span>
            <span className="font-mono text-[11px] text-ink-soft">
              {project.slug}
            </span>
            <span className="font-sans text-[11px] text-ink-soft">
              {kindLabel(project.kind)} · {statusLabel(project.status)}
            </span>
            <span className="font-sans text-[11px] text-ink-soft">
              {logsCountLabel(project._count.logs)}
            </span>
            <span className="ml-auto flex items-baseline gap-4 font-mono text-[11px]">
              <Link
                href={`/admin/projects?edit=${project.id}`}
                className="border-b border-ink text-ink"
              >
                编辑
              </Link>
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={project.id} />
                <SubmitButton
                  label="删除"
                  pendingLabel="删除中…"
                  confirmMessage="确认要彻底删除吗？此操作不可恢复。"
                  className="border-b border-ink text-ink disabled:text-ink-soft"
                />
              </form>
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t border-ink pt-8">
        <h2 className="font-sans text-[10px] text-ink-soft">
          {editing ? "编辑项目" : "新建项目"}
        </h2>

        <form
          key={editing?.id ?? "new"}
          action={saveProjectAction}
          className="mt-6 grid gap-6 md:grid-cols-2"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field
            label="标识"
            name="slug"
            defaultValue={editing?.slug}
            placeholder="earth-mirror"
            required
            pattern={SLUG_SOURCE}
            invalid={bad("slug")}
          />
          <Field
            label="名称"
            name="name"
            defaultValue={editing?.name}
            placeholder="地球 Mirror"
            required
            maxLength={LIMITS.projectName}
            invalid={bad("name")}
          />
          <Select
            label="类型"
            name="kind"
            options={PROJECT_KINDS}
            labelMap={kindLabel}
            defaultValue={editing?.kind ?? PROJECT_KINDS[0]}
          />
          <Select
            label="状态"
            name="status"
            options={PROJECT_STATUSES}
            labelMap={statusLabel}
            defaultValue={editing?.status ?? PROJECT_STATUSES[0]}
          />
          <Field
            label="简介"
            name="summary"
            defaultValue={editing?.summary ?? undefined}
            maxLength={LIMITS.projectSummary}
            invalid={bad("summary")}
          />
          <Field
            label="仓库 URL"
            name="repoUrl"
            defaultValue={editing?.repoUrl ?? undefined}
            pattern={REPO_URL_SOURCE}
            invalid={bad("repoUrl")}
          />

          <div className="flex items-baseline gap-6 md:col-span-2">
            <SubmitButton
              label={editing ? "保存修改" : "新建项目"}
              pendingLabel="提交中…"
              className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink disabled:text-ink-soft"
            />
            {editing && (
              <Link
                href="/admin/projects"
                className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
              >
                取消
              </Link>
            )}
          </div>
        </form>
      </section>
    </>
  );
}

