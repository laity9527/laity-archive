/**
 * 文件：src/app/layout.tsx
 * 描述：全局根布局：纸白背景、中文语言标记、站点元信息
 * 作者：张磊
 * 创建日期：2026-10-30
 * 修改记录：
 * - 2026-10-30: 基于脚手架创建，替换为项目元信息，去默认字体与暗色
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laity 项目档案库",
  description: "厂牌官网与开发复盘证据链",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}