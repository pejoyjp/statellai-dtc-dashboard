import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { FieldHelp } from "@/components/ui/field-help";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { reportingBucketLabel, type ReportingPeriod } from "../domain/reporting-period";
import { useLanguage } from "@/components/language";
import { smoothLine, tooltipOrder } from "./chart-series";
type Slice = { label: string | null; sales: number | null };

const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
type Point = { time: string; value: number | null };
type Series = { label: string; points: Point[]; kind?: "bars"; color?: string };

export function Breakdown({ title, description, rows, money, emptyLabel, metricLabel, pie = false }: {
  title: string; description?: string; rows: Slice[] | null | undefined; money(value?: number | null): string; emptyLabel: string; metricLabel?: string; pie?: boolean;
}) {
  const { t } = useLanguage();
  const positive = rows?.filter(row => row.sales != null && row.sales > 0) ?? [];
  const total = positive.reduce((sum, row) => sum + row.sales!, 0);
  const [active, setActive] = useState<Slice | null>(null);
  const colors = new Map(positive.map((row, index) => [row, palette[index % palette.length]]));
  const listedTotal = rows?.some(row => row.sales != null)
    ? rows.reduce((sum, row) => sum + (row.sales ?? 0), 0)
    : null;
  const circumference = 2 * Math.PI * 36;
  let offset = 0;
  const segments = [];
  for (const row of positive) {
    const share = row.sales! / total;
    segments.push({ row, offset, share });
    offset += share;
  }
  return <Card className="report-card report-chart-card">
    <CardHeader className="report-card-header"><div className="sales-report-title"><h3>{title}</h3>{description && <FieldHelp label={`${title} · ${t("指标说明")}`} description={description}/>}</div></CardHeader>
    <CardContent className="report-card-body">
    {rows?.length ? <div className={pie && total ? "report-breakdown has-pie" : "report-breakdown"}>
      {pie && total > 0 && <div className="report-pie" onPointerLeave={() => setActive(null)}>
        <ChartContainer config={chartConfig} className="report-pie-chart" aria-label={title}>
          <PieChart accessibilityLayer><Pie data={positive} dataKey="sales" nameKey="label" innerRadius="58%" outerRadius="78%" stroke="none" isAnimationActive={false} onMouseEnter={(_, index) => setActive(positive[index])} onClick={(_, index) => setActive(positive[index])}>
            {positive.map((row, index) => <Cell key={index} fill={colors.get(row)} opacity={active && active !== row ? 0.35 : 1}/>)}
          </Pie></PieChart>
        </ChartContainer>
        <div className="report-pie-value" aria-hidden="true">
          <span>{active ? active.label ?? emptyLabel : metricLabel ?? t("总销售额")}</span>
          <strong>{money(active ? active.sales : total)}</strong>
          {active?.sales != null && active.sales > 0 && <small>{(active.sales / total * 100).toFixed(1)}%</small>}
        </div>
      </div>}
      <ul className="report-breakdown-list">{rows.map((row, index) => <li key={index}>
        <button type="button" className={active === row ? "is-active" : undefined}
          onPointerEnter={() => setActive(row)} onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(row)} onBlur={() => setActive(null)} onClick={() => setActive(row)}>
          <span><i style={{ background: colors.get(row) ?? "var(--border)" }}/>{row.label ?? emptyLabel}</span>
          <strong>{money(row.sales)}</strong>
        </button>
      </li>)}
      <li className="report-breakdown-total"><span>{t("总和")}</span><strong>{money(listedTotal)}</strong></li>
      </ul>
    </div> : <p className="report-empty">{t(rows ? "暂无数据" : "数据暂不可用")}</p>}
    {pie && rows?.some(row => row.sales != null && row.sales < 0) && <p className="report-period">{t("饼图仅显示正销售额。")}</p>}
    </CardContent>
  </Card>;
}

export function TrendChart({ title, description, series, leftUnit, rightUnit, action, formatLeft, period }: {
  title: string; description?: string; series: Series[]; leftUnit: string; rightUnit?: string; action?: ReactNode; formatLeft?: (value: number) => string; period?: Pick<ReportingPeriod, "timezone" | "bucket">;
}) {
  const { t } = useLanguage();
  const times = [...new Set(series.flatMap(item => item.points.map(point => point.time)))].sort();
  const values = series.map(item => new Map(item.points.map(point => [point.time, point.value])));
  const data = times.map(time => Object.fromEntries([["time", time], ...values.map((map, index) => [`series${index}`, map.get(time) ?? null])]));
  const config: ChartConfig = Object.fromEntries(series.map((item, index) => [`series${index}`, { label: item.label, color: palette[index % palette.length] }]));
  const tick = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
  const labelTime = (time: string) => period ? reportingBucketLabel(time, period.timezone, period.bucket) : time.replace("T", " ");
  const hasValues = series.some(item => item.points.some(point => point.value != null));
  const leftAvailable = series.some(item => item.kind !== "bars" && item.points.some(point => point.value != null));
  const rightAvailable = series.some(item => item.kind === "bars" && item.points.some(point => point.value != null));
  const barWidth = Math.min(24, (right - left) / times.length * 0.75);
  const seriesColor = (item: Series, index: number) => item.color ?? palette[index % palette.length];

  const selected = activeTime && position.has(activeTime) ? activeTime : null;
  return <Card className="report-card report-chart-card">
    <CardHeader className="report-card-header"><div className="sales-report-title"><h3>{title}</h3>{description && <FieldHelp label={`${title} · ${t("指标说明")}`} description={description}/>}</div>{action}</CardHeader>
    <CardContent className="report-card-body">
    {hasValues ? <>
      {period && <p className="report-period">{t("店铺时区")} · {period.timezone}</p>}
      <ul className="report-legend">{series.map((item, index) => <li key={item.label}>
        <i className={item.kind === "bars" ? "is-bar" : undefined} style={{ background: seriesColor(item, index) }}/>{item.label}
      </li>)}</ul>
      <div className="report-plot" onPointerLeave={() => setActiveTime(null)} onBlur={() => setActiveTime(null)}>
      <svg className="report-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title}>
        {selected && <line x1={position.get(selected)} x2={position.get(selected)} y1={top} y2={bottom} stroke="#94a3b8" strokeDasharray="4 4"/>}
        <text x={left - 8} y="16" textAnchor="end">{leftUnit}</text>
        {rightUnit && <text x={right + 8} y="16">{rightUnit}</text>}
        {[0, 1, 2, 3, 4].map(index => {
          const fraction = index / 4;
          const row = bottom - (bottom - top) * fraction;
          return <g key={index}>
            <line x1={left} x2={right} y1={row} y2={row} stroke="#e5e5e5"/>
            <text x={left - 8} y={row + 4} textAnchor="end">{leftAvailable ? tick.format(salesRange.min + (salesRange.max - salesRange.min) * fraction) : "—"}</text>
            {rightUnit && <text x={right + 8} y={row + 4}>{rightAvailable ? tick.format(sessionsRange.max * fraction) : "—"}</text>}
          </g>;
        })}
        {series.map((item, index) => {
          const color = seriesColor(item, index);
          const values = new Map(item.points.map(point => [point.time, point.value]));
          if (item.kind === "bars") return <g key={item.label}>{item.points.map(point => {
            if (point.value == null) return null;
            const row = y(point.value, sessionsRange);
            return <rect key={point.time} x={position.get(point.time)! - barWidth / 2} y={row} width={barWidth} height={Math.max(0, bottom - row)} fill={color} fillOpacity={selected === point.time ? ".9" : ".48"}/>;
          })}</g>;
          const path = smoothLine(times.map(time => {
            const value = values.get(time);
            return { x: position.get(time)!, y: value == null ? null : y(value, salesRange) };
          }));
          return <g key={item.label}>
            <path d={path} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {item.points.map(point => point.value == null ? null : <circle key={point.time} cx={position.get(point.time)} cy={y(point.value, salesRange)} r={selected === point.time ? 4 : times.length === 1 ? 4 : 2.5} fill={color} stroke={selected === point.time ? "#fff" : "none"} strokeWidth={selected === point.time ? 2 : 0}/>)}
          </g>;
        })}
        {tickTimes.map((time, index) => <text key={time} x={position.get(time)} y={bottom + 24}
          textAnchor={times.length >= 4 && index === 0 ? "start" : times.length >= 4 && index === tickTimes.length - 1 ? "end" : "middle"}>{shortTime(time)}</text>)}
        {times.map((time, index) => {
          const bucketWidth = (right - left) / times.length;
          return <rect className="report-chart-hit" key={time} x={left + bucketWidth * index} y={top} width={bucketWidth} height={bottom - top}
            fill="transparent" tabIndex={selected === time || (!selected && index === 0) ? 0 : -1}
            aria-label={period ? `${labelTime(time)} · ${period.timezone}` : time} onPointerEnter={() => setActiveTime(time)} onPointerDown={() => setActiveTime(time)}
            onFocus={() => setActiveTime(time)} onKeyDown={event => {
              if (event.key === "Escape") setActiveTime(null);
              const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
              if (!delta) return;
              event.preventDefault();
              const sibling = delta < 0 ? event.currentTarget.previousElementSibling : event.currentTarget.nextElementSibling;
              if (sibling instanceof SVGElement && sibling.classList.contains("report-chart-hit")) sibling.focus();
            }}/>;
        })}
      </svg>
      {selected && <div className="report-chart-tooltip" role="tooltip" data-side={position.get(selected)! < width / 2 ? "right" : "left"}>
        <strong>{labelTime(selected)}</strong>
        {period && <small>{period.timezone}</small>}
        {tooltipOrder(series.map((item, index) => ({
          item, index, value: item.points.find(point => point.time === selected)?.value ?? null,
        }))).map(({ item, index, value }) => <div key={item.label}>
          <span><i style={{ background: seriesColor(item, index) }}/>{item.label}</span>
          <b>{value == null ? "—" : item.kind !== "bars" && formatLeft ? formatLeft(value) : value.toLocaleString()}</b>
        </div>)}
      </div>}
      </div>
    </> : <p className="report-empty">{t("数据暂不可用")}</p>}
    </CardContent>
  </Card>;
}
