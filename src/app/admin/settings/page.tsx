/**
 * 文件：src/app/admin/settings/page.tsx
 * 描述：后台设置页（第一版）：站点标识与集成状态只读展示，个人显示名可改
 * 作者：张磊
 * 创建日期：2026-11-16
 * 修改记录：
 * - 2026-11-16: 初始创建（评审 P5-1）。裁定“站点标识不改由后台”：SITE_NAME / SITE_DESCRIPTION / SITE_URL
 *               参与 generateMetadata 与预渲染，改成 DB 驱动会让页面变动态且与 .env 两套真值；
 *               本页把每个值的来源键名写出来，可改的只有 User.name（后台侧栏与看板共用的显示名）
 * - 2026-11-16: 评审 A6：只读区补一句“改法”（编辑服务器 .env 后重启，后台不保存），
 *               避免读者把只读当成功能失效
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdminSession } from "@/auth";
import { updateDisplayNameAction } from "@/app/admin/settings-actions";
import { db } from "@/lib/db";
import { siteContactEmail, siteDescription, siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "设置",
  robots: { index: false, follow: false },
};

// 读会话与库，导航进来必然阻塞。instant = false 只用于退出即时导航校验，不改变渲染方式
export const instant = false;

type SettingRow = { label: string; value: string; source: string };

export default async function AdminSettingsPage() {
  await connection();
  const session = await requireAdminSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin%2Fsettings");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      handle: true,
      email: true,
      githubId: true,
      githubAccessToken: true,
    },
  });

  const siteRows: SettingRow[] = [
    { label: "站点名称", value: siteName, source: "SITE_NAME" },
    { label: "站点描述", value: siteDescription, source: "SITE_DESCRIPTION" },
    { label: "站点地址", value: siteUrl(), source: "SITE_URL" },
    { label: "联系邮箱", value: siteContactEmail() || "未配置", source: "SITE_CONTACT_EMAIL" },
  ];

  const integrations: { label: string; ok: boolean; note: string }[] = [
    {
      label: "GitHub 账号",
      ok: Boolean(user?.githubId),
      note: user?.githubId ? `已绑定（handle：${user.handle}）` : "未绑定",
    },
    {
      label: "仓库同步令牌",
      ok: Boolean(user?.githubAccessToken),
      note: user?.githubAccessToken
        ? "已加密保存（不显示值）；如需刷新，重新登录一次即可"
        : "未保存；重新登录一次即可获取",
    },
  ];

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ink-soft">
            SETTINGS
          </p>
          <h1 className="mt-2 text-[32px] font-medium tracking-tight">设置</h1>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="border-b border-hairline pb-2 font-sans text-xs tracking-[0.16em] text-ink-soft">
          站点标识（只读）
        </h2>
        <p className="mt-3 max-w-[640px] font-sans text-xs leading-relaxed text-ink-soft">
          <strong className="font-medium text-ink">不在后台改</strong>：这几项来自服务器环境变量，
          参与页面元信息与预渲染；一旦后台也能写，就会和 <code className="font-mono">.env</code> 形成两套真值。
          <span className="mt-2 block text-ink">
            改法：编辑服务器上的 <code className="font-mono">.env</code> 后重启应用；后台不保存这些值。
          </span>
        </p>
        <dl className="mt-5 border-t border-hairline">
          {siteRows.map((row) => (
            <div
              key={row.source}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-3"
            >
              <dt className="font-sans text-xs text-ink-soft">{row.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 text-right">
                <span className="font-sans text-xs text-ink">{row.value}</span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {row.source}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="border-b border-hairline pb-2 font-sans text-xs tracking-[0.16em] text-ink-soft">
          个人资料
        </h2>
        <form action={updateDisplayNameAction} className="mt-5 max-w-[480px]">
          <label
            htmlFor="display-name"
            className="block font-sans text-[11px] text-ink-soft"
          >
            显示名（出现在后台右上角与档案看板）
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id="display-name"
              name="name"
              defaultValue={user?.name ?? ""}
              maxLength={40}
              placeholder="留空会被拒绝，最多 40 字"
              className="min-w-0 flex-1 border border-hairline bg-transparent px-3 py-2 font-sans text-sm text-ink"
            />
            <button
              type="submit"
              className="border border-ink px-4 py-2 font-sans text-xs text-ink hover:bg-ink hover:text-paper"
            >
              保存显示名
            </button>
          </div>
          <p className="mt-2 font-sans text-[11px] text-ink-soft">
            账号标识（handle：{user?.handle ?? "未知"}）与邮箱由 GitHub 提供，不在此修改。
          </p>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="border-b border-hairline pb-2 font-sans text-xs tracking-[0.16em] text-ink-soft">
          GitHub 集成
        </h2>
        <ul className="mt-4">
          {integrations.map((item) => (
            <li
              key={item.label}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-3"
            >
              <span className="font-sans text-xs text-ink">{item.label}</span>
              <span className="font-sans text-xs text-ink-soft">
                {item.note}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
