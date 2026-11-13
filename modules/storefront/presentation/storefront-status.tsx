"use client";
import { useLanguage } from "@/components/language";
import { useEffect, useState } from "react";
import { ExternalLink, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Status = { status: "available" | "attention" | "unknown"; url?: string; message: string; httpStatus?: number; checkedAt: string };
export default function StorefrontStatus() {
  const { t, lang } = useLanguage();
  const [result, setResult] = useState<Status | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function check() { try { const response = await fetch("/api/storefront/availability", { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error(); setResult(await response.json()); } catch { if (!controller.signal.aborted) setResult({ status: "unknown", message: "访问状态检查失败", checkedAt: new Date().toISOString() }); } }
    const timer = window.setTimeout(() => { if (document.visibilityState === "visible") void check(); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void check(); }, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); window.clearTimeout(timer); window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  const variant = result?.status === "available" ? "success" : result?.status === "attention" ? "warning" : "secondary";
  const label = !result ? t("检测中") : result.status === "available" ? t("可访问") : result.status === "attention" ? t("需要关注") : t("无法判断");
  return <Card className="mb-4"><CardContent className="flex flex-wrap items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Globe2 size={19}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{t('店铺首页访问')}</span><Badge variant={variant}>{t(label)}</Badge>{result?.url && <a href={result.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">{result.url}<ExternalLink size={12}/></a>}</div><p className="mt-1 text-xs text-muted-foreground">{result ? `${t(result.message)} · ${lang === "en" ? "Checked at" : "检测于"} ${new Date(result.checkedAt).toLocaleString(lang === "en" ? "en-US" : "zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : t("正在检查首页…")}</p></div><span className="text-xs text-muted-foreground">{t('服务器视角 · 每分钟检查')}</span></CardContent></Card>;
}
