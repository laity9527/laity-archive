/**
 * 文件：src/app/page.tsx
 * 描述：首页（Phase 3 改版）：Hero 介绍、服务列表（启用项 sort 升序）、FAQ 折叠面板、
 *       嵌入公开线索表单；档案区经 Hero 入口链接到达，原索引大厅看板移出首页
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 初始创建占位版
 * - 2026-10-30: Phase 2 完整版，看板与最新日志均读真库（未缓存查询由 Suspense 包裹）
 * - 2026-11-02: 看板改由 getArchiveBoard 供数（零日志项目也上榜），新增精选区与 /projects 入口（I029/I030，经批准补做）
 * - 2026-11-05: 三个区头与精选行的枚举标签中文化，枚举翻译改走 src/lib/labels.ts 单源；中文标签去 font-mono 与 0.2em 字距
 * - 2026-11-06: 空态 NO LOG YET 与 Suspense fallback 的 LOADING… 中文化（暂无已发布日志 / 加载中…），同批去掉中文行的 font-mono 与宽字距
 * - 2026-11-06: 首屏文案按负责人要求改为「数字档案，记录每一次工程决策。」+「收集项目作品与开发复盘，构建一份可信的数字履历。」；字号阶与颜色（h1 36px 主墨、副标 18px 辅助灰）未动，故 D30 A4 那组层间区分度样本仍成立
 * - 2026-11-06: 任务 2 桌面端两栏——外层 `md:flex md:items-start md:justify-between`，精选项目占 `md:w-2/3` 并以 `md:border-r md:border-hairline md:pr-12` 收边，
 *               右栏 `md:w-1/3 md:pl-12` 垂直堆叠档案状态与最新日志；原来挂在档案状态 section 上的 `mt-20` 移到右栏外层并加 `md:mt-0`。
 *               移动端不加任何 md: 前缀的类即回落为原有单列流式；零圆角、零阴影、分隔只用 1px `--color-hairline`
 * - 2026-11-06: 右栏改容器查询（负责人裁断一，A 方案）——右栏外层加 `@container`，日志行的横排条件由 `md:flex-row md:gap-10`
 *               改为 `@[36rem]:flex-row @[36rem]:gap-10`。起因是实测：`md:` 判的是视口宽度不是栏宽，1280 视口下 344px 的右栏里
 *               200px 时间轴 + 40px gap 只给标题剩 56px，20px 标题折成 13 行 364px 高。容器查询按栏宽决定横竖排，
 *               BEFORE/AFTER 双段时间轴的表达保留（栏够宽仍横排），不是把时间轴删掉
 * - 2026-11-06: 「最新日志」口径修正——取数由 `getSafeLogs({ take: 3 })`（按 beforeDate 排）改为 `getLatestLogs(3)`（按 publishedAt 排，
 *               同秒并列时以 beforeDate 兜底）；原 `logs.slice(0, 3)` 随之外提为查询的 take，渲染部分未改动
 * - 2026-11-06: 「最新日志」每条标题下增两行摘要——取 lessonLearned（实测 12 条已发布日志的经验总结均非空、65–109 字、且 0 条含 Markdown 语法，故直接原文渲染不写剥离器；对照：beforeContent 有 11/12 条含 # 或反引号，直接截断会把语法漏到前台）。行数以 CSS `line-clamp-2` 截两行为准；lessonLearned 在 schema 里可空，为空时整段不渲染，不留空行
 * - 2026-11-09: V2.0 Step 3 阶段一：精选项目与最新日志的跳转链接改 /u/[handle]/... 体系——
 *               看板条目带出 user.handle（getArchiveBoard 的 select 白名单）、日志行带出 log.user.handle（getLatestLogs 同）；
 *               首页仍展示全站精选（裁定 ①：大厅与首页为全局聚合视图，租户视图在 /u/[handle]）
 * - 2026-11-13: 显著升级 A：标语下加馆藏条（项目数 / 已发布数 / 最近更新，复用同一次 board+latest 取数，
 *               零新增查询）；精选行加 mono 索引 01–03；两处「全部」入口统一 12px；项目链接改走
 *               publicProjectHref()（原先手拼，与看板同一处 404 根因）；版心首页放宽到 1200px
 * - 2026-11-13: 显著升级 B4：Suspense fallback 由「加载中…」文本改为暖线骨架（LoadingRows）
 * - 2026-11-13: 首页主题入口：新增「按主题」区块（8 个主题 + 计数），计数来自 getTopicCounts
 *               的单列 tags 查询；首页自此为 3 次查询，仍在 O8 预算内
 * - 2026-11-13: 本轮升级：精选口径改调 pickFeatured（与租户主页同一实现），删掉页内重复的排序规则
 * - 2026-11-16: 重构 B0：Hero 重排（display 字号 + ink 收边线）、四个区块统一走 SectionHead（编号 + 中文标签 + 右侧入口），
 *               间距按十档收紧（Hero 后 48 / 区块之间 64/96），馆藏条改 hairline 收边。数据逻辑一字未动
 * - 2026-11-19: V5 Phase 3 改版（负责人确认方案 A）：页面重构为四区块——Hero 介绍（含 /projects /logs /archive
 *               档案入口链接）、服务列表（listEnabledServices，sort 升序）、FAQ 折叠面板（原生 details，
 *               listEnabledFaqs）、嵌入 <LeadForm />（Suspense 边界隔离，流式渲染不阻塞）。
 *               提交复用 /api/lead 全链路（双层限流/蜜罐/时长/ipHash/审计），页内零提交逻辑；
 *               原索引大厅看板（馆藏条/精选/最新日志/按主题）移出首页，档案可达性由 Hero 链接承担
 */
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LeadForm } from "@/components/home/LeadForm";
import { SectionHead } from "@/components/site/SectionHead";
import { listEnabledFaqs } from "@/lib/faq-admin";
import { listEnabledServices } from "@/lib/service-admin";

export const instant = false;

// Hero 的档案区入口：改版后首页不再承载看板，档案可达性由这三个链接承担
const HERO_LINKS = [
  { href: "/projects", label: "作品档案" },
  { href: "/logs", label: "开发日志" },
  { href: "/archive", label: "归档" },
];

const entryLink = "border-b border-transparent text-xs text-ink hover:border-ink";

export default async function HomePage() {
  await connection();
  const [services, faqs] = await Promise.all([listEnabledServices(), listEnabledFaqs()]);

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-6 py-16 max-md:py-8">
      <section className="border-b border-hairline pb-12">
        <p className="font-mono text-[10px] tracking-[0.3em] text-ink-soft">LAITY ARCHIVE</p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
          数字档案，记录每一次工程决策。
        </h1>
        <p className="mt-4 max-w-[640px] font-sans text-sm leading-relaxed text-ink-soft">
          收集项目作品与开发复盘，构建一份可信的数字履历；关键内容带 SHA-256
          存证摘要，可逐字核对。
        </p>
        <nav aria-label="档案区入口" className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {HERO_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={entryLink}>
              {item.label} →
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-16">
        <SectionHead
          index="01"
          title="服务"
          action={
            <Link href="/services" className={entryLink}>
              全部服务 →
            </Link>
          }
        />
        {services.length === 0 ? (
          <p className="mt-4 font-sans text-xs text-ink-soft">暂无已启用的服务。</p>
        ) : (
          <ul className="mt-4">
            {services.map((service) => (
              <li key={service.id} className="border-b border-hairline py-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-ink-soft">{String(service.sort).padStart(2, "0")}</span>
                  <h3 className="text-base font-medium tracking-tight text-ink">{service.title}</h3>
                </div>
                {service.summary && (
                  <p className="mt-1 font-sans text-xs leading-relaxed text-ink-soft">{service.summary}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <SectionHead
          index="02"
          title="常见问题"
          action={
            <Link href="/faq" className={entryLink}>
              全部问答 →
            </Link>
          }
        />
        {faqs.length === 0 ? (
          <p className="mt-4 font-sans text-xs text-ink-soft">暂无已启用的问答。</p>
        ) : (
          <div className="mt-2">
            {faqs.map((faq) => (
              <details key={faq.id} className="border-b border-hairline py-4">
                <summary className="cursor-pointer font-sans text-sm text-ink">{faq.question}</summary>
                <p className="mt-2 font-serif text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        )}
      </section>

      <section id="lead" className="mt-16">
        <SectionHead index="03" title="合作线索" />
        <Suspense
          fallback={<p className="mt-4 font-sans text-xs text-ink-soft">表单加载中…</p>}
        >
          <LeadForm />
        </Suspense>
      </section>
    </main>
  );
}
