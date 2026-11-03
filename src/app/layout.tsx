/**
 * 文件：src/app/layout.tsx
 * 描述：全局根布局：纸白背景、中文字体与等宽字体挂载、站点元信息
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 基于脚手架创建，替换为项目元信息，去默认字体与暗色
 * - 2026-10-30: 接入 Inter / Noto Serif SC / JetBrains Mono（next/font），字体变量供全站使用
 * - 2026-11-03: 元信息升级为 metadataBase + 标题模板 + Open Graph，并挂载前台持久导航 SiteNav
 */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
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
    default: `${siteName} · 厂牌官网与开发复盘证据链`,
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
      <body className="min-h-full bg-paper font-sans text-ink">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
