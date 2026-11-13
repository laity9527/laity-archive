/**
 * 文件：src/app/about/page.tsx
 * 描述：关于页：站主简介、技术栈标签与联系方式；联系方式读环境变量，未配置显示"待补充"不虚构
 * 作者：张磊
 * 创建日期：2026-11-05
 * 修改记录：
 * - 2026-11-05: 初始创建。按 SPEC 的 F19 与 DESIGN 的 D31 落地——静态生成、三段内容、
 *               联系方式走 SITE_CONTACT_EMAIL（未配置不编造），仓库地址取仓库里已登记的那一个
 * - 2026-11-13: 修正两处口令时代残留（V2.0 Step 4-A 已恢复 GitHub OAuth，D33）：
 *               个人简介里的「后台只有一把口令」与技术栈里的「NextAuth.js — 后台口令登录与会话」
 */
import type { Metadata } from "next";
import Link from "next/link";
import { siteContactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于",
  description: "站主是谁、这个档案库记什么、用什么做，以及怎么联系。",
};

// 只写仓库里可核对的事实：不出年份、不出粉丝数、不出"多年经验"这类无法验证的说法
const PROFILE: string[] = [
  "我是张磊，这个站的主人与唯一的作者：代码、文案、发布与运维都是我一个人。后台用 GitHub 账号登录，只有站主一个账号，没有第二位作者。",
  "这里不是博客，也不放教程。它记的是判断过程——每条开发日志都成对写着 BEFORE（当时怎么判断、为什么这样做）与 AFTER（做完之后验证成什么、哪里不对），底部带这一版正文的 SHA-256 摘要与服务器发布时间，可以和页面上一字一字对。",
  "档案里的第一条记录就是这个项目自己：laity-archive 连同它自己的开发日志都在库里，用同一套后台录入、同一个口径发布。之所以先把自己收进去，是因为一份讲不出真实过程的档案库，不值得别人引用。",
  "工作方式写在仓库根目录的约定里：技术栈锁定不做漂移、四道门禁全 0 才算能发版、范围外的问题记账不顺手改、凭据不进仓库也不进对话。这个站是这个工作方式的产物，也是它的证据。",
];

// 只列名称与用途，不带版本号——版本是实测值，唯一口径在 AGENTS.md，抄进页面就多一处会漂的地方
const STACK: { name: string; note: string }[] = [
  { name: "Next.js", note: "App Router 全栈框架（RSC + Server Actions）" },
  { name: "React", note: "视图层" },
  { name: "TypeScript", note: "类型系统与编译" },
  { name: "Tailwind CSS", note: "样式工具类（无组件库、无图标库）" },
  { name: "Prisma", note: "schema、迁移与数据访问" },
  { name: "PostgreSQL", note: "数据库（Docker 容器）" },
  { name: "NextAuth.js", note: "GitHub OAuth 登录与会话" },
  { name: "阿里云 OSS", note: "正文插图的对象存储外链" },
  { name: "react-markdown", note: "日志正文渲染，过 rehype-sanitize 消毒" },
  { name: "Node.js", note: "运行时与内置 test runner" },
];

const FONTS: string[] = ["Inter", "Noto Serif SC", "JetBrains Mono"];

export default function AboutPage() {
  const contactEmail = siteContactEmail();

  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <header className="mt-8 border-b border-hairline pb-8">
        <h1 className="text-3xl font-medium">关于</h1>
        <p className="mt-4 font-mono text-[11px] text-ink-soft">
          站主 · 这个档案库记什么 · 用什么做 · 怎么联系
        </p>
      </header>

      <section className="mt-12">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          个人简介
        </h2>
        <div className="mt-4 space-y-4 text-lg leading-relaxed">
          {PROFILE.map((paragraph) => (
            <p key={paragraph.slice(0, 16)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-hairline pt-12">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          技术栈
        </h2>
        <ul className="mt-4 space-y-2 font-mono text-xs leading-relaxed">
          {STACK.map((item) => (
            <li key={item.name}>
              <span className="text-ink">{item.name}</span>
              <span className="text-ink-soft"> — {item.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-[11px] text-ink-soft">
          字体：{FONTS.join(" · ")}（全部开源可商用）
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-soft">
          依赖与许可证逐条列在
          <Link
            href="/licenses"
            className="ml-1 border-b border-transparent text-ink hover:border-ink"
          >
            开源许可
          </Link>
          <span className="ml-1">页。</span>
        </p>
      </section>

      <section className="mt-12 border-t border-hairline pt-12">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          联系方式
        </h2>
        <dl className="mt-4 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <dt className="w-20 shrink-0 text-ink-soft">邮箱</dt>
            <dd>
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent("站点联系")}`}
                  className="border-b border-transparent text-ink hover:border-ink"
                >
                  {contactEmail}
                </a>
              ) : (
                <span className="text-ink-soft italic">待补充</span>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4">
            <dt className="w-20 shrink-0 text-ink-soft">代码仓库</dt>
            <dd>
              <a
                href="https://github.com/laity9527/laity-archive"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="border-b border-transparent text-ink hover:border-ink"
              >
                laity9527/laity-archive ↗
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-soft">
          邮箱由服务器环境变量提供，配置之后这一行才会出现真实地址；在此之前它显示「待补充」——
          本站不写占位邮箱，也不虚构社交账号与第三方主页。站内联系方式与数据处理的完整口径，
          写在
          <Link
            href="/privacy"
            className="ml-1 border-b border-transparent text-ink hover:border-ink"
          >
            隐私与数据说明
          </Link>
          <span className="ml-1">页。</span>
        </p>
      </section>
    </main>
  );
}
