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
};

const fontVariables = [
  inter.variable,
  notoSerifSC.variable,
  jetbrainsMono.variable,
].join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
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
