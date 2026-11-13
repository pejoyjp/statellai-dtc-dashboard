import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language";
import { AppShell } from "@/components/layout/app-shell";
import { ReportingProvider } from "@/modules/shared/presentation/reporting-period";
import "./globals.css";
export const metadata: Metadata = { title: "Black Friday | 运营数据看板", description: "2026 Black Friday 活动运营数据" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><LanguageProvider><ReportingProvider><AppShell>{children}</AppShell></ReportingProvider></LanguageProvider></body></html>;
}
