/**
 * 文件：src/app/admin/projects/page.tsx
 * 描述：项目管理：列表（含日志数）、新建/编辑表单、PRJ_001/PRJ_002 错误提示
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建
 */
import Link from "next/link";
import { deleteProjectAction, saveProjectAction } from "@/app/admin/project-actions";
import { getProjectById, listProjects } from "@/lib/projects";

export const instant = false;

type ProjectsPageProps = {
  searchParams: Promise<{ error?: string | string[]; edit?: string | string[] }>;
};

const ERROR_TEXT: Record<string, string> = {
  AUTH_001: "会话已失效，请重新登录。",
  VAL_001: "参数不合法：slug 只能用小写字母、数字与连字符（2–64 位），名称必填。",
  PRJ_001: "该项目下还有日志，禁止删除。",
  PRJ_002: "slug 已被占用，换一个。",
};

function pickParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
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
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const errorCode = pickParam(params.error);
  const editId = pickParam(params.edit);

  const projects = await listProjects();
  const editing = editId ? await getProjectById(editId) : null;
  const errorText = errorCode ? (ERROR_TEXT[errorCode] ?? errorCode) : null;

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">项目</h1>

      {errorText && (
        <p className="mt-6 border border-ink px-4 py-3 font-mono text-xs text-ink">
          {errorCode} · {errorText}
        </p>
      )}

      <ul className="mt-10 border-t border-ink">
        {projects.length === 0 && (
          <li className="border-b border-hairline py-6 font-mono text-xs text-ink-soft">
            NO PROJECT YET
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
            <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">
              {project.kind.toUpperCase()} · {project.status}
            </span>
            <span className="font-mono text-[11px] text-ink-soft">
              {project._count.logs} LOGS
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
                <button type="submit" className="border-b border-ink text-ink">
                  删除
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t border-ink pt-8">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          {editing ? "EDIT PROJECT" : "NEW PROJECT"}
        </h2>

        <form
          key={editing?.id ?? "new"}
          action={saveProjectAction}
          className="mt-6 grid gap-6 md:grid-cols-2"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field label="SLUG" name="slug" defaultValue={editing?.slug} placeholder="earth-mirror" />
          <Field label="NAME" name="name" defaultValue={editing?.name} placeholder="地球 Mirror" />
          <Select
            label="KIND"
            name="kind"
            options={["product", "tool", "site"]}
            defaultValue={editing?.kind ?? "product"}
          />
          <Select
            label="STATUS"
            name="status"
            options={["WIP", "LIVE", "ARCHIVED"]}
            defaultValue={editing?.status ?? "WIP"}
          />
          <Field label="SUMMARY" name="summary" defaultValue={editing?.summary ?? undefined} />
          <Field label="REPO URL" name="repoUrl" defaultValue={editing?.repoUrl ?? undefined} />

          <div className="flex items-baseline gap-6 md:col-span-2">
            <button
              type="submit"
              className="border-b border-ink font-mono text-[11px] tracking-[0.2em] text-ink"
            >
              {editing ? "保存修改" : "新建项目"}
            </button>
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
