/**
 * 文件：src/app/layout.tsx
 * 描述：全局根布局：纸白背景、中文字体与等宽字体挂载、站点元信息
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 基于脚手架创建，替换为项目元信息，去默认字体与暗色
 * - 2026-10-30: 接入 Inter / Noto Serif SC / JetBrains Mono（next/font），字体变量供全站使用
 * - 2026-11-03: 元信息升级为 metadataBase + 标题模板 + Open Graph，并挂载前台持久导航 SiteNav
 * - 2026-11-03: 挂页脚 SiteFooter（隐私入口 + ICP 备案号合规位），备案号在服务端读取后以 prop 下传
 * - 2026-11-03: 默认标题从"开发复盘证据链"改为"开发复盘档案"——对外文案只描述事实，不暗示法律效果
 * - 2026-11-12: F27 RSS 订阅：metadata 加 alternates.types 指向 /feed.xml，全站 head 自动发现（官方文档原样写法，
 *               metadataBase 已就位，相对路径渲染为绝对 URL）
 * - 2026-11-16: 重构 B1-a：body 首子元素插入主题脚本（先定 html[data-theme] 再绘制，消除闪白），
 *               html 加 suppressHydrationWarning（dataset 由脚本在 hydrate 前改写）
 */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import {
  siteContactEmail,
  siteDescription,
  siteIcp,
  siteName,
  sitePoliceIcp,
  siteUrl,
} from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-serif-sc",
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    template: `%s · ${siteName}`,
    default: `${siteName} · 厂牌官网与开发复盘档案`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    url: siteUrl(),
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
      "application/feed+json": "/feed.json",
    },
  },
};

const fontVariables = [
  inter.variable,
  notoSerifSC.variable,
  jetbrainsMono.variable,
].join(" ");

// 首屏主题：localStorage 优先，否则跟随系统。必须是阻塞脚本且在任何内容之前执行，
// 否则纸白底会先画出来再变暗（闪白）。CSP 的 script-src 已放行 inline
export const themeScript = `(function(){try{var s=localStorage.getItem("laity-theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=s||(m?"dark":"light");}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteNav />
        <div className="flex-1">{children}</div>
        <SiteFooter
          icp={siteIcp()}
          policeIcp={sitePoliceIcp()}
          contactEmail={siteContactEmail()}
        />
      </body>
    </html>
  );
}
