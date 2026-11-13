"use client";

import { useId, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { enUS, zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseCivilDate, updateCivilDate, updateCivilTime } from "@/lib/civil-date";

export function DateTimePicker({ label, value, onChange, language, clearable = false }: {
  label: string; value: string; onChange(value: string): void; language: "zh" | "en"; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const selected = parseCivilDate(value);
  const time = value.includes("T") ? value.split("T")[1] : "";
  const locale = language === "zh" ? zhCN : enUS;
  return <div className="report-date-field">
    <label htmlFor={id} className="report-date-label">{label}{clearable && <small>{language === "zh" ? "留空表示至今" : "Leave blank for now"}</small>}</label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="report-date-trigger" data-filtered={Boolean(value)}>
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>
          <span className={value ? undefined : "text-muted-foreground"}>{value ? value.replace("T", " ") : (language === "zh" ? "选择日期和时间" : "Choose date and time")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" aria-label={label}>
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={date => { if (date) onChange(updateCivilDate(value, date)); }} locale={locale} />
        <div className="space-y-3 border-t p-3">
          <label htmlFor={`${id}-time`} className="flex items-center gap-2 text-sm font-medium"><Clock3 aria-hidden="true" className="size-4 text-muted-foreground"/>{language === "zh" ? "时间（店铺时区）" : "Time (store timezone)"}</label>
          <Input id={`${id}-time`} type="time" step="1" value={time} disabled={!selected} onChange={event => onChange(updateCivilTime(value, event.target.value))}/>
          {clearable && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { onChange(""); setOpen(false); }}>{language === "zh" ? "清除结束时间" : "Clear end time"}</Button>}
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}
