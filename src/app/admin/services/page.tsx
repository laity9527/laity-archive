/**
 * 文件：src/app/admin/services/page.tsx
 * 描述：后台服务介绍管理：新建/编辑（含排序）、启用/禁用、软删除
 * 作者：张磊
 * 创建日期：2026-11-19
 * 修改记录：
 * - 2026-11-19: 初始创建（V5 Phase 2 任务 3.2）。排序用 sort 表单项（与主题页同口径），软删除只翻 deletedAt
 * - 2026-11-20: a11y 二期 L3：启用/确认两个复选框补 aria-label（带上条目标题，满足 Label in Name）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { getService, listServices } from "@/lib/service-admin";
import {
  deleteServiceAction,
  saveServiceAction,
  setServiceEnabledAction,
} from "@/lib/service-actions";

export const metadata: Metadata = {
  title: "服务",
  robots: { index: false, follow: false },
};

export const instant = false;

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{
    id?: string | string[];
    error?: string | string[];
    saved?: string | string[];
    enabled?: string | string[];
    deleted?: string | string[];
  }>;
};

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ERROR_TEXT: Record<string, string> = {
  SERVICE_001: "服务名称或内容冲突，换一个。",
  SERVICE_002: "标题必填且不超过 60 字，简介不超过 200 字，正文不超过 20000 字，排序必须是整数。",
  SERVICE_003: "服务不存在，可能已被删除。",
  SERVICE_004: "服务状态不能这样变更，或删除前未勾选确认。",
};

export default async function AdminServicesPage({ searchParams }: Props) {
  const query = await searchParams;
  await connection();
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fservices");

  const id = pick(query.id);
  const [list, editing] = await Promise.all([
    listServices({ page: 1, pageSize: PAGE_SIZE }),
    id ? getService(id) : Promise.resolve(null),
  ]);
  const error = pick(query.error);
  const saved = pick(query.saved);
  const enabled = pick(query.enabled);
  const deleted = pick(query.deleted);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-sans text-xs text-ink-soft">服务 · 共 {list.total} 条</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">服务</h1>
        </div>
        <Link href="/admin" className="border-b border-ink font-sans text-xs text-ink">
          ← 概览
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">
          {ERROR_TEXT[error] ?? "操作没有完成。"}
        </p>
      )}
      {saved && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已保存。</p>}
      {enabled && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">启用状态已更新。</p>}
      {deleted && <p role="status" className="mt-6 border border-ink px-4 py-3 font-sans text-xs text-ink">已删除（软删除）。</p>}

      <form action={saveServiceAction} className="mt-8 grid gap-4 border-y border-hairline py-5 sm:grid-cols-[1fr_2fr_70px_auto]">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          标题
          <input
            name="title"
            required
            maxLength={60}
            defaultValue={editing?.title ?? ""}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          简介（≤200 字）
          <input
            name="summary"
            maxLength={200}
            defaultValue={editing?.summary ?? ""}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-xs text-ink-soft">
          排序
          <input
            name="sort"
            type="number"
            defaultValue={editing?.sort ?? 0}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="flex items-end gap-3">
          <button type="submit" className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper">
            {editing ? "保存修改" : "新建服务"}
          </button>
          {editing && (
            <Link href="/admin/services" className="border-b border-ink font-sans text-xs text-ink">
              取消
            </Link>
          )}
        </div>
        <label className="col-span-full flex flex-col gap-1 font-sans text-xs text-ink-soft">
          正文（≤20000 字）
          <textarea
            name="body"
            rows={4}
            maxLength={20000}
            defaultValue={editing?.body ?? ""}
            className="border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
          />
        </label>
      </form>

      {list.items.length === 0 ? (
        <p className="mt-8 border-t border-ink py-6 font-sans text-xs text-ink-soft">
          还没有服务。新建后默认禁用，启用后才在前台 /services 展示。
        </p>
      ) : (
        <ul className="mt-8 border-t border-ink">
          {list.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-hairline py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/services?id=${item.id}`} className="text-base hover:underline hover:decoration-1 hover:underline-offset-4">
                  {item.title}
                </Link>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  排序 {item.sort} · {item.enabled ? "已启用" : "已禁用"}
                  {item.deletedAt && <> · 已删除</>}
                </p>
                {item.summary && <p className="mt-1 font-sans text-xs text-ink-soft">{item.summary}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                <form action={setServiceEnabledAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="flex items-center gap-1 text-ink-soft">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={item.enabled}
                      aria-label={`启用「${item.title}」`}
                    />
                    启用
                  </label>
                  <button type="submit" className="border-b border-ink text-ink">保存状态</button>
                </form>
                <form action={deleteServiceAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="flex items-center gap-1 text-ink-soft">
                    <input
                      type="checkbox"
                      name="confirmDelete"
                      aria-label={`确认删除「${item.title}」`}
                    />
                    确认
                  </label>
                  <button type="submit" className="border-b border-ink text-ink">删除</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
