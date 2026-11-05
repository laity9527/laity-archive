/**
 * 文件：src/app/licenses/page.tsx
 * 描述：开源许可与致谢页：列出直接依赖与字体的许可证、商标声明，作为对外公开的合规页
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（合规方案 7.1 / 7.2 落地）。依赖许可值来自 node_modules 实测，字体许可标注为未联网复核
 * - 2026-11-04: 三处 text-[13px] 归到字号阶上的 14px（text-sm）——13 不在 10/11/12/14/18 里（D27）
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  DEPENDENCY_LICENSES,
  FONT_LICENSES,
  TRADEMARK_NOTE,
  type DependencyLicense,
} from "@/lib/licenses";

export const metadata: Metadata = {
  title: "开源许可与致谢",
  description:
    "本站使用的开源组件及其许可证清单，附第三方商标声明。全部为宽松许可（MIT / Apache-2.0 / ISC / SIL OFL），不含传染性许可。",
};

function LicenseList({ items }: { items: DependencyLicense[] }) {
  return (
    <ul className="mt-4 border-t border-ink">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex flex-wrap items-baseline gap-x-4 border-b border-hairline py-3"
        >
          <span className="font-mono text-[12px] text-ink">{item.name}</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-soft">
            {item.license}
          </span>
          <span className="w-full text-sm leading-relaxed text-ink-soft sm:w-auto sm:flex-1">
            {item.purpose}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function LicensesPage() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 首页
      </Link>

      <h1 className="mt-8 text-3xl font-medium">开源许可与致谢</h1>

      <p className="mt-4 font-mono text-[11px] text-ink-soft">
        本页只列直接依赖；传递依赖的许可以各自上游仓库为准。清单由
        tests/licenses.test.ts 与 package.json 对拍，漏登记或出现传染性许可会让检查失败。
      </p>

      <section className="mt-12">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          运行时与开发依赖
        </h2>
        <LicenseList items={DEPENDENCY_LICENSES} />
      </section>

      <section className="mt-16">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          字体
        </h2>
        <LicenseList items={FONT_LICENSES} />
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          字体不随本仓库分发，由框架构建期从 Google Fonts 拉取后自托管产物。
          上述许可按项目事实基座登记的字体白名单（SIL OFL / Apache 2.0）填写，
          <strong className="font-medium text-ink">本次未联网复核上游 LICENSE 原文</strong>
          ，若与上游不一致以字体仓库声明为准。
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
          商标声明
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {TRADEMARK_NOTE}
        </p>
      </section>

      <p className="mt-16 border-t border-hairline pt-6 font-mono text-[10px] leading-relaxed text-ink-soft">
        © 2026 Laity。本站文字内容著作权归作者张磊所有；日志正文插图来自免版权图库或作者自制。
        数据与 Cookie 的处理方式见
        <Link href="/privacy" className="ml-1 border-b border-ink text-ink">
          隐私与数据说明
        </Link>
        。
      </p>
    </main>
  );
}
