"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { ReportingPeriod } from "../domain/reporting-period";

type Range = { start: string; end: string };
const defaultRange = { start: "", end: "" };
const ReportingContext = createContext<{ range: Range; setRange(range: Range): void }>({
  range: defaultRange, setRange: () => {},
});
export function ReportingProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState(defaultRange);
  return <ReportingContext.Provider value={{ range, setRange }}>{children}</ReportingContext.Provider>;
}

export function useReportingPeriod() { return useContext(ReportingContext); }

export function useReport<T>(url: string, revision: number) {
  const [result, setResult] = useState<{ url: string; revision: number; data?: T; message?: string; internalEmails?: string[] }>();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!active) return;
        const payload = await response.json();
        if (active) {
          setResult(response.ok ? { url, revision, data: payload } : { url, revision, message: payload.message, internalEmails: payload.internalEmails });
        }
      } catch {
        if (active) setResult({ url, revision, message: "无法获取看板数据，请稍后重试。" });
      }
    }
    void load();
    return () => { active = false; };
  }, [url, revision]);
  const matching = result?.url === url;
  return { data: matching ? result.data : undefined, internalEmails: result?.internalEmails, message: matching && result.revision === revision ? result.message : undefined, loading: !matching || result.revision !== revision };
}

export function RangeFields({ range, period, onChange }: { range: Range; period?: ReportingPeriod; onChange(range: Range): void }) {
  const { t, lang } = useLanguage();
  return <>
    <DateTimePicker label={t("开始时间")} language={lang} value={range.start || period?.start || ""} onChange={value => onChange({ ...range, start: value })}/>
    <DateTimePicker label={t("结束时间")} language={lang} value={range.end} clearable onChange={value => onChange({ ...range, end: value })}/>
  </>;
}

export function PeriodLabel({ period }: { period?: ReportingPeriod }) {
  const { t } = useLanguage();
  if (!period) return null;
  return <p className="report-period">{period.start.replace("T", " ")} – {period.end.replace("T", " ")} · {period.timezone}{period.throughNow ? ` · ${t("至今")}` : ""}</p>;
}

export function PeriodToolbar({ period, refresh }: { period?: ReportingPeriod; refresh(): void }) {
  const { t } = useLanguage();
  const { range, setRange } = useReportingPeriod();
  const [draft, setDraft] = useState(range);
  return <form className="report-filters print-control" onSubmit={event => {
    event.preventDefault();
    setRange(draft);
    refresh();
  }}>
    <RangeFields range={draft} period={period} onChange={setDraft}/>
    <Button type="submit">{t("应用筛选")}</Button>
    <Button type="button" variant="outline" onClick={() => { setDraft(defaultRange); setRange(defaultRange); refresh(); }}>{t("重置筛选")}</Button>
  </form>;
}
