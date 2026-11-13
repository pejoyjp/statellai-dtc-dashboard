import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FilterOptions({ label, values, options, onChange }: {
  label: string; values: string[]; options?: string[] | null; onChange(values: string[]): void;
}) {
  const { t } = useLanguage();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const available = [...new Set([...(options ?? []), ...values])];

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="report-filter-options" ref={root} onKeyDown={event => {
    if (open && event.key === "Escape") { event.preventDefault(); close(); }
  }}>
    <Button ref={trigger} type="button" variant="outline" className="report-filter-trigger" data-filtered={values.length > 0}
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {
        if (!open) {
          setDraft(values);
          const left = trigger.current?.getBoundingClientRect().left ?? 0;
          const width = Math.min(288, document.documentElement.clientWidth - 24);
          setOffset(Math.min(0, document.documentElement.clientWidth - 12 - left - width));
        }
        setOpen(!open);
      }}>
      <span>{t(label)}</span>
      {values.length ? <Badge variant="secondary" className="report-filter-count"><Check size={12} aria-hidden="true"/>{values.length}</Badge>
        : <ChevronDown size={14} aria-hidden="true"/>}
    </Button>
    {open && <div className="report-filter-menu" id={id} role="group" aria-label={t(label)} style={{ insetInlineStart: offset, insetInlineEnd: "auto" }}>
      <div className="report-filter-list">
        {!available.length && <p>{t(options ? "暂无数据" : "数据暂不可用")}</p>}
        {available.map(value => <label key={value} data-checked={draft.includes(value)}>
          <input type="checkbox" checked={draft.includes(value)} onChange={event => {
            setDraft(event.target.checked ? [...draft, value] : draft.filter(item => item !== value));
          }}/>{value}
        </label>)}
      </div>
      <div className="report-filter-footer">
        <Button type="button" variant="ghost" size="sm" disabled={!draft.length} onClick={() => setDraft([])}>{t("清空选择")}</Button>
        <Button type="button" size="sm" onClick={() => { onChange(draft); close(); }}>{t("确认筛选")}</Button>
      </div>
    </div>}
  </div>;
}

export function AppliedFilters({ items }: { items: { label: string; values: string[] }[] }) {
  const { t } = useLanguage();
  const active = items.filter(item => item.values.length);
  if (!active.length) return null;
  return <ul className="report-applied-filters" aria-label={t("已生效的筛选")}>
    {active.map(({ label, values }) => <li key={label}>
      <Badge variant="outline" className="report-applied-badge">
        <span>{t(label)}</span><strong>{values.join(", ")}</strong>
      </Badge>
    </li>)}
  </ul>;
}
