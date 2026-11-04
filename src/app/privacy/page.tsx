/**
 * 文件：src/app/privacy/page.tsx
 * 描述：隐私与数据说明页：讲清本站收集什么、存在哪里、怎么删，作为上线合规的公开承诺
 * 作者：张磊
 * 创建日期：2026-11-03
 * 修改记录：
 * - 2026-11-03: 初始创建（内容按当前实现逐条核对，不写做不到的承诺）
 * - 2026-11-03: 删除口径改到与代码一致：后台有「彻底删除」（需回填 slug），且图片对象不随删除移除（密钥无删除权限）
 * - 2026-11-04: 管理员登录段随 D20 改写：GitHub OAuth → 服务器里的管理员口令，并写明换口令不等于吊销会话
 * - 2026-11-04: 补上会话有效期的实际数值（12 小时，D25）——只说"过期前有效"等于没承诺
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "隐私与数据说明",
  description:
    "本站不注册、不追踪、不放第三方脚本：说明会话 Cookie 的用途、内容与图片的存放位置，以及删除方式。",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "访客",
    body: [
      "访客浏览本站不需要注册，也不需要登录。站内没有统计代码、没有埋点、没有第三方分析脚本，也没有任何跟踪用的 Cookie 或像素。",
      "服务器与反向代理会按运维惯例记录访问请求的 IP、时间、User-Agent 与返回码，用于故障定位与容量判断；这些访问日志不做行为分析，也不与站内任何内容关联画像。传输由 nginx 终结 TLS，仅启用 TLS 1.2 与 1.3。",
    ],
  },
  {
    heading: "管理员登录",
    body: [
      "后台只有管理员一人可进，登录用的是一把只存在服务器环境变量里的口令。本站不接入任何第三方账号体系、不向第三方索取资料，口令也不进数据库、不进日志、不出现在页面上——校验时只对它的 SHA-256 摘要做常量时间比较，原文不落地。",
      "会话以签名 JWT 的形式存在浏览器 Cookie 中，有效期 12 小时，签名密钥只保存在服务器环境变量里；除会话必需的 Cookie 外，登录后不再放置其他 Cookie。需要立刻踢掉某个登录态时，只换口令不够——已签发的 JWT 在过期前仍然有效，必须换签名密钥（这会让所有会话一起失效）。",
    ],
  },
  {
    heading: "内容存在哪里",
    body: [
      "日志与项目的文字内容存放在自有服务器的 PostgreSQL 数据库中；正文插图存放在阿里云对象存储（OSS），页面以直接链接引用。写入 OSS 使用的是最小权限子账号密钥——只允许向固定的 logs/ 前缀写入，不能删除、不能列举。",
      "每条日志在发布时会把「标题 + 判断正文 + 验证正文」按固定顺序拼接后计算 SHA-256 摘要，并记录服务器的 UTC 时间，摘要与发布时间随详情页一起公开。这意味着已公开的内容本身是可被第三方独立核验的，请勿在正文中写入不便公开的信息。",
    ],
  },
  {
    heading: "下架与删除",
    body: [
      "已发布内容可以在后台一键下架，下架后前台立即不可见、并从站点地图中移除，正文摘要与历史发布时间作为留痕保留。后台另提供「彻底删除」：连正文、摘要与发布时间一起从数据库中消失，不可恢复，因此执行前要求原样输入该条日志的标识作为确认。",
      "彻底删除不会移除正文里引用过的图片对象。写入对象存储用的是一把只有上传权限、没有删除与列举权限的最小权限密钥，这是刻意的配置；遗留对象由存储桶的生命周期规则清理，不由应用发起删除。",
      "本站没有评论区、没有用户上传入口，因此不存放第三方用户产生的内容。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[0.2em] text-ink-soft hover:text-ink"
      >
        ← 返回首页
      </Link>

      <header className="mt-8 border-b border-hairline pb-8">
        <h1 className="text-3xl font-medium">隐私与数据说明</h1>
        <p className="mt-4 font-mono text-[11px] text-ink-soft">
          这份说明只描述本站当前真实的行为，不承诺做不到的事。
        </p>
      </header>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-mono text-[10px] tracking-[0.2em] text-ink-soft">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 16)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
