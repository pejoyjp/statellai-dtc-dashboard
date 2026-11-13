"use client";
import { useLanguage } from "@/components/language";

import { useCallback, useEffect, useState } from "react";
import { Activity, Clock3, Gauge, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { classifyPerformance } from "../domain/performance";
import StorefrontStatus from "@/modules/storefront/presentation/storefront-status";

type Metrics = { page_loads?: string | number | null; lcp_p75_ms?: string | number | null; inp_p75_ms?: string | number | null; p75_cls?: string | number | null; ttfb_p75_ms?: string | number | null };
type Result = { status: string; metrics?: Metrics | null; message?: string; updatedAt?: string };
const definitions = [
  { key: "lcp_p75_ms", name: "最大内容绘制", short: "LCP", description: "主要内容加载速度", good: 2500, poor: 4000, icon: Gauge, target: "良好 ≤ 2.5 秒" },
  { key: "inp_p75_ms", name: "交互响应", short: "INP", description: "页面响应操作的速度", good: 200, poor: 500, icon: Activity, target: "良好 ≤ 200 毫秒" },
  { key: "p75_cls", name: "布局稳定性", short: "CLS", description: "页面内容意外位移", good: 0.1, poor: 0.25, icon: LayoutDashboard, target: "良好 ≤ 0.1" },
  { key: "ttfb_p75_ms", name: "首字节时间", short: "TTFB", description: "服务器开始响应的时间", good: 800, poor: 1800, icon: Clock3, target: "良好 ≤ 800 毫秒" },
] as const;
function numberValue(value: string | number | null | undefined) { if (value == null || value === "") return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
function displayValue(key: keyof Metrics, value: number | null, lang: "zh" | "en") { if (value === null) return "—"; if (key === "p75_cls") return value.toFixed(2); if (key === "lcp_p75_ms") return `${(value / 1000).toFixed(2)} ${lang === "en" ? "s" : "秒"}`; return `${Math.round(value).toLocaleString("en-US")} ${lang === "en" ? "ms" : "毫秒"}`; }
export default function SiteHealth() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const response = await fetch("/api/storefront/performance", { cache: "no-store", signal }); const result: Result = await response.json(); setData(result); }
    catch (error) { if (error instanceof Error && error.name === "AbortError") return; setData({ status: "error", message: "无法获取网站健康度，请稍后重试。" }); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => { void load(controller.signal); }, 0); return () => { controller.abort(); window.clearTimeout(timer); }; }, [load]);
  const count = numberValue(data?.metrics?.page_loads);
  return <section className="mt-8" id="site-health">
    <div className="section-title"><div><span className="section-number">02</span><h2>{t('网站健康度')}</h2><span className="section-sub">WEB PERFORMANCE</span></div><Button variant="outline" size="sm" onClick={() => { setLoading(true); void load(); }} disabled={loading}><RefreshCw size={14}/>{loading ? t("更新中") : t("刷新")}</Button></div>
    <StorefrontStatus/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-foreground">{t('真实访客体验')}</span><span>{t('最近 30 个自然日（含今天） · 北京时间 · 全部设备')}</span></div><span className="text-xs">{data?.updatedAt && data.status === "connected" ? `${lang === "en" ? "Updated" : "更新于"} ${new Date(data.updatedAt).toLocaleString(lang === "en" ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : loading ? t("正在获取数据") : t("数据暂不可用")}</span></div>
    {data?.status === "error" || data?.status === "unconfigured" ? <Alert variant="destructive" className="mb-4"><AlertDescription>{t(data.message || "")}</AlertDescription></Alert> : null}
    <div className="health-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{definitions.map(({ key, name, short, description, good, poor, icon: Icon, target }) => {
      const value = numberValue(data?.metrics?.[key]);
      const status = classifyPerformance(value, good, poor);
      const label = status === "good" ? t("良好") : status === "moderate" ? t("需改善") : status === "poor" ? t("较差") : t("暂无数据");
      const variant = status === "good" ? "success" : status === "moderate" ? "warning" : status === "poor" ? "destructive" : "secondary";
      const iconClass = short === "LCP" ? "bg-indigo-50 text-indigo-600" : short === "INP" ? "bg-blue-50 text-blue-600" : short === "CLS" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600";
      return <Card key={key} className="overflow-hidden">
        <CardHeader className="gap-4 pb-3"><div className="flex items-start justify-between gap-3"><span className={`flex size-10 items-center justify-center rounded-lg ${iconClass}`}><Icon size={19}/></span><Badge variant={variant}>{t(label)}</Badge></div><div className="flex items-center gap-2"><CardTitle className="text-sm font-medium">{t(name)}</CardTitle><span className="text-xs text-muted-foreground">{short}</span></div></CardHeader>
        <CardContent className="pb-4"><div className="text-2xl font-semibold tracking-tight">{displayValue(key, value, lang)}</div><CardDescription className="mt-1">{t(description)}</CardDescription></CardContent>
        <CardFooter className="border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground">{t(target)}<span className="mx-1">·</span>P75</CardFooter>
      </Card>;
    })}</div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-relaxed text-muted-foreground"><span>{t('P75 表示 75% 的测量值不高于该数值。数据来自 Shopify 真实用户监测，可能存在延迟。')}</span><span>{t("页面加载次数")}：{count === null ? "—" : count.toLocaleString("zh-CN")}</span></div>
  </section>;
}
