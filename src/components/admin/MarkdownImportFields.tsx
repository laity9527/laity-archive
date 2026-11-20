/**
 * 文件：src/components/MarkdownImportFields.tsx
 * 描述：Markdown 导入表单：读本地 .md 文件、推导标题与 slug、提交为草稿
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 G10）。文件只在浏览器本地读取（File.text），不上传服务器；
 *               读到的标题/slug/正文只做预填，提交前仍可改。200KB 上限是防呆，不是安全边界
 * - 2026-11-19: V5 Phase 5 子任务2：组件目录归组，迁至 src/components/admin/（纯结构调整，组件逻辑/样式/导出未变）
 */
"use client";

import { useState } from "react";
import { importLogAction } from "@/app/admin/log-actions";
import { LIMITS, SLUG_SOURCE } from "@/lib/forms";
import { deriveImportMeta } from "@/lib/markdown-import";

type ProjectOption = { id: string; name: string };

type MarkdownImportFieldsProps = {
  projects: ProjectOption[];
  // 服务器给的今天（UTC 日期串），避免客户端水合时日期漂移
  today: string;
};

export function MarkdownImportFields({
  projects,
  today,
}: MarkdownImportFieldsProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  async function readFile(file: File | null | undefined) {
    if (!file) return;

    if (file.size > 200_000) {
      setNotice("文件超过 200KB，请先在本地拆分后再导入。");
      return;
    }

    const text = await file.text();
    const meta = deriveImportMeta(file.name, text);

    setFileName(file.name);
    setTitle(meta.title);
    setSlug(meta.slug);
    setBody(meta.body);
    setNotice(
      meta.slug
        ? null
        : "文件名推不出英文 slug（中文名常见），请手动填写下方 slug。",
    );
  }

  return (
    <form action={importLogAction} className="mt-8 space-y-8">
      <div
        className={`border border-dashed p-6 text-center ${
          dragging ? "border-ink bg-ink/[0.03]" : "border-hairline"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void readFile(event.dataTransfer.files[0]);
        }}
      >
        <p className="font-sans text-sm text-ink">
          把 .md 文件拖到这里，或
          <label className="mx-1 cursor-pointer border-b border-ink">
            选择文件
            <input
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="sr-only"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </p>
        <p className="mt-2 font-sans text-[11px] text-ink-soft">
          文件只在浏览器本地读取，不上传；导入只会生成
          <strong className="font-medium text-ink">草稿</strong>
          ，不会发布，也不会覆盖已有 slug。
        </p>
        {fileName && (
          <p className="mt-2 font-mono text-[10px] text-ink-soft">
            已读取：{fileName}
          </p>
        )}
      </div>

      {notice && (
        <p role="alert" className="border border-ink px-4 py-3 font-sans text-xs text-ink">
          {notice}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="font-sans text-[10px] text-ink-soft">标题</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={LIMITS.title}
            placeholder="首个 # 标题会自动填入"
            className="mt-1 w-full border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="font-sans text-[10px] text-ink-soft">slug</span>
          <input
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            pattern={SLUG_SOURCE}
            placeholder="英文文件名会自动推导"
            className="mt-1 w-full border-b border-hairline bg-transparent py-1 font-mono text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="font-sans text-[10px] text-ink-soft">项目</span>
          <select
            name="projectId"
            required
            defaultValue={projects[0]?.id ?? ""}
            className="mt-1 w-full border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-sans text-[10px] text-ink-soft">标签</span>
          <input
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="逗号分隔，可留空"
            className="mt-1 w-full border-b border-hairline bg-transparent py-1 font-sans text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="font-sans text-[10px] text-ink-soft">决策日期</span>
          <input
            type="date"
            name="beforeDate"
            defaultValue={today}
            required
            className="mt-1 w-full border-b border-hairline bg-transparent py-1 font-mono text-sm text-ink"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-sans text-[10px] text-ink-soft">正文（Markdown）</span>
        <textarea
          name="beforeContent"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          rows={18}
          placeholder="也可以直接粘贴 Markdown；粘贴时请自行删掉与标题重复的 # 行"
          className="mt-2 w-full border border-hairline bg-transparent p-3 font-mono text-[13px] leading-relaxed text-ink"
        />
      </label>

      <div className="flex flex-wrap items-baseline gap-4">
        <button
          type="submit"
          className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
        >
          导入为草稿
        </button>
        <span className="font-sans text-[11px] text-ink-soft">
          slug 已存在时会提示并跳过，不覆盖已有日志。
        </span>
      </div>
    </form>
  );
}
