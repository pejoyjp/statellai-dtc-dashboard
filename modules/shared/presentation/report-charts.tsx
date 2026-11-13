import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { FieldHelp } from "@/components/ui/field-help";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { reportingBucketLabel, type ReportingPeriod } from "../domain/reporting-period";
import { useLanguage } from "@/components/language";
type Slice = { label: string | null; sales: number | null };

const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
type Point = { time: string; value: number | null };
type Series = { label: string; points: Point[]; kind?: "bars" };

export function Breakdown({ title, description, rows, money, emptyLabel, metricLabel, pie = false }: {
  title: string; description?: string; rows: Slice[] | null | undefined; money(value?: number | null): string; emptyLabel: string; metricLabel?: string; pie?: boolean;
}) {
  const { t } = useLanguage();
  const positive = rows?.filter(row => row.sales != null && row.sales > 0) ?? [];
  const total = positive.reduce((sum, row) => sum + row.sales!, 0);
  const [active, setActive] = useState<Slice | null>(null);
  const colors = new Map(positive.map((row, index) => [row, palette[index % palette.length]]));
  const chartConfig: ChartConfig = { sales: { label: metricLabel ?? t("总销售额") } };
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
      </li>)}</ul>
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
  return <Card className="report-card report-chart-card">
    <CardHeader className="report-card-header"><div className="sales-report-title"><h3>{title}</h3>{description && <FieldHelp label={`${title} · ${t("指标说明")}`} description={description}/>}</div>{action}</CardHeader>
    <CardContent className="report-card-body">
    {hasValues ? <>
      {period && <p className="report-period">{t("店铺时区")} · {period.timezone}</p>}
      <ul className="report-legend">{series.map((item, index) => <li key={item.label}><i className={item.kind === "bars" ? "is-bar" : undefined} style={{ background: palette[index % palette.length] }}/>{item.label}</li>)}</ul>
      <div className="report-chart-units"><span>{leftUnit}</span>{rightUnit && <span>{rightUnit}</span>}</div>
      <ChartContainer config={config} className="report-recharts" aria-label={title}>
        <ComposedChart accessibilityLayer data={data} margin={{ top: 8, right: rightUnit ? 4 : 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)"/>
          <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={35} tickFormatter={value => labelTime(String(value)).replace(/^\d{4}-/, "").slice(0, 11)}/>
          <YAxis yAxisId="left" tickLine={false} axisLine={false} width={52} tickFormatter={value => tick.format(value)} domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(1, max)]}/>
          {rightUnit && <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={48} tickFormatter={value => tick.format(value)} domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(1, max)]}/>}
          <Tooltip filterNull={false} content={({ active, label }) => {
            if (!active || label == null) return null;
            const time = String(label);
            return <div className="report-recharts-tooltip" role="tooltip"><strong>{labelTime(time)}</strong>{period && <small>{period.timezone}</small>}{series.map((item, index) => {
              const value = values[index].get(time);
              return <div key={index}><span>{item.label}</span><b>{value == null ? "—" : item.kind !== "bars" && formatLeft ? formatLeft(value) : value.toLocaleString()}</b></div>;
            })}</div>;
          }}/>
          {series.map((item, index) => item.kind === "bars"
            ? <Bar key={index} yAxisId={rightUnit ? "right" : "left"} dataKey={`series${index}`} fill={palette[index % palette.length]} fillOpacity={0.48} maxBarSize={24} isAnimationActive={false}/>
            : <Line key={index} yAxisId="left" dataKey={`series${index}`} type="linear" stroke={palette[index % palette.length]} strokeWidth={2.5} dot={times.length === 1} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false}/>)}
        </ComposedChart>
      </ChartContainer>
    </> : <p className="report-empty">{t("数据暂不可用")}</p>}
    </CardContent>
  </Card>;
}
