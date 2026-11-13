import { useState, type CSSProperties } from "react";
import { useLanguage } from "@/components/language";
import { FieldHelp } from "@/components/ui/field-help";
import { reportCopy } from "./report-copy";
import { Card } from "@/components/ui/card";
import { Breakdown, TrendChart } from "@/modules/shared/presentation/report-charts";
import { aggregate, dimension, salesRow, utmFields, variantFields } from "../domain/report-breakdowns";
import { metricNumber, type AnalyticsRow, type SalesReport } from "../domain/sales-report";
import { AppliedFilters, FilterOptions } from "./report-filter-options";

type Format = (value?: number | null) => string;
type Props = { data?: SalesReport; money: Format; number: Format; percentage: Format; currency: string };
type Selections = Record<string, string[]>;
const [sku, variant] = variantFields;
const code = "discount_code";
const page = "landing_page_path";
const channel = "referring_channel";
const trafficFields = [channel, ...utmFields] as const;
const columns: Record<string, string> = {
  [channel]: "引荐渠道", [sku]: "SKU", [variant]: "变体名称", [code]: "折扣码", [page]: "Page path",
  utm_source: "UTM Source", utm_medium: "UTM Medium", utm_campaign: "UTM Campaign",
  sales: "总销售额", quantity: "净销量", sessions: "会话", bounce: "跳出率",
  duration: "平均浏览时长", cart: "加购会话", checkout: "开始结账会话",
};

function sortRows(rows: AnalyticsRow[] | null, field: string) {
  return rows ? [...rows].sort((a, b) => (metricNumber(b[field]) ?? -Infinity) - (metricNumber(a[field]) ?? -Infinity)) : null;
}

function matches(row: AnalyticsRow, selected: Selections, aliases: Record<string, string> = {}) {
  return Object.entries(selected).every(([field, values]) => !values.length || values.includes(dimension(row, aliases[field] ?? field) ?? ""));
}

function choices(rows: AnalyticsRow[] | null | undefined, field: string, score: (row: AnalyticsRow) => number | null) {
  return (sortRows(aggregate(rows, [field], { score }), "score") ?? []).flatMap(row => {
    const value = dimension(row, field);
    return value ? [value] : [];
  });
}

function Controls({ fields, options, selected, setSelected }: {
  fields: readonly string[]; options: Record<string, string[]>; selected: Selections; setSelected(value: Selections): void;
}) {
  return <>
    <div className="report-filters breakdown-controls print-control">
      {fields.map(field => <FilterOptions key={field} label={columns[field]} values={selected[field] ?? []}
        options={options[field]} onChange={values => setSelected({ ...selected, [field]: values })}/>)}
    </div>
    <AppliedFilters items={fields.map(field => ({ label: columns[field], values: selected[field] ?? [] }))}/>
  </>;
}

const metricColors: Record<string, string> = {
  sales: "var(--chart-1)", quantity: "var(--metric-quantity)", sessions: "var(--metric-sessions)", bounce: "var(--metric-bounce)",
  duration: "var(--metric-duration)", cart: "var(--metric-cart)", checkout: "var(--metric-checkout)",
};

function Table({ title, help, fields, rows, sort, formats, compact = false }: {
  title: string; help: string; compact?: boolean; fields: readonly string[]; rows: AnalyticsRow[] | null; sort: string; formats: Record<string, Format>;
}) {
  const { t } = useLanguage();
  const sorted = sortRows(rows, sort);
  const ranges = Object.fromEntries(Object.keys(formats).map(field => {
    const values = (sorted ?? []).flatMap(row => {
      const value = metricNumber(row[field]);
      return value === null ? [] : [value];
    });
    return [field, { min: Math.min(0, ...values), max: Math.max(0, ...values) }];
  }));
  return <Card className={compact ? "report-card report-table-card report-page-table" : "report-card report-table-card"}>
    <div className="sales-report-title"><h3>{t(title)}</h3><FieldHelp label={`${t(title)} · ${t("指标说明")}`} description={t(help)}/></div>
    {sorted?.length ? <div className="report-table-scroll" role="region" tabIndex={0} aria-label={t(title)}>
      <table><thead><tr>{fields.map(field => <th key={field} scope="col" data-numeric={Boolean(formats[field])}
        aria-sort={field === sort ? "descending" : undefined}>{t(columns[field])}{field === sort && <span aria-hidden="true"> ↓</span>}
      </th>)}</tr></thead>
      <tbody>{sorted.map((row, index) => <tr key={index}>{fields.map(field => {
        const value = metricNumber(row[field]);
        const range = ranges[field];
        const shade = range && value !== null && range.max !== range.min
          ? (value - range.min) / (range.max - range.min) : 0;
        const style = range && value !== null && metricColors[field] ? {
          "--metric-color": metricColors[field], "--metric-tint": `${Math.round(7 + shade * 30)}%`,
        } as CSSProperties : undefined;
        return <td key={field} data-numeric={Boolean(formats[field])} data-field={field}>
          {formats[field] ? <span className={style ? "report-metric-value" : undefined} style={style}>{formats[field](value)}</span>
            : dimension(row, field) ?? t("未标记")}
        </td>;
      })}</tr>)}</tbody></table>
    </div> : <p className="report-empty">{t(rows ? "暂无数据" : "数据暂不可用")}</p>}
  </Card>;
}

function slices(rows: AnalyticsRow[] | null, field: string, metric: string) {
  return sortRows(rows, metric)?.map(row => ({ label: dimension(row, field), sales: metricNumber(row[metric]) })) ?? null;
}

function series(rows: AnalyticsRow[] | null, field: string, bucket: string, metric: string, ranked: string[], unknown: string, limit = 5) {
  const groups = new Map<string | null, { time: string; value: number | null }[]>();
  for (const row of rows ?? []) {
    const time = dimension(row, bucket);
    if (!time) continue;
    const label = dimension(row, field);
    const points = groups.get(label) ?? [];
    points.push({ time, value: metricNumber(row[metric]) });
    groups.set(label, points);
  }
  const ordered = [...new Set([...ranked, ...groups.keys()])].filter(label => groups.has(label));
  return ordered.slice(0, limit).map(label => ({ label: label ?? unknown, points: groups.get(label)! }));
}

function SkuBreakdown({ data, money, number, currency }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Selections>({});
  const rows = data?.sku?.map(row => ({ [sku]: row.sku, [variant]: row.variant, sales: row.sales, quantity: row.quantity }));
  const readSales = (row: AnalyticsRow) => metricNumber(row.sales);
  const filtered = rows?.filter(row => matches(row, selected)) ?? null;
  const skuTotals = aggregate(filtered, [sku], { sales: readSales });
  const bucket = data?.period.bucket ?? "day";
  const timeline = data?.breakdowns?.skuTimeline?.filter(row => matches(row, selected));
  const attributed = (row: AnalyticsRow) => "total_sales__last_non_direct_click" in row;
  const points = aggregate(timeline, [sku, bucket], { sales: row => salesRow(row, attributed(row)).sales });
  const ranked = choices(filtered, sku, readSales);
  return <section className="sales-module" id="sales-sku">
    <div className="section-title"><h2>{t("SKU 表现")}</h2></div>
    <Controls fields={variantFields} selected={selected} setSelected={setSelected} options={{
      [sku]: choices(rows, sku, readSales), [variant]: choices(rows, variant, readSales),
    }}/>
    <div className="report-pair">
      <TrendChart period={data?.period} title={t(reportCopy.skuTrend.title)} description={t(reportCopy.skuTrend.help)} leftUnit={currency} formatLeft={money}
        series={series(points, sku, bucket, "sales", ranked, t("无 SKU"), selected[sku]?.length || 5)}/>
      <Breakdown title={t(reportCopy.skuMix.title)} description={t(reportCopy.skuMix.help)} rows={slices(skuTotals, sku, "sales")} money={money} emptyLabel={t("无 SKU")} pie/>
    </div>
    {ranked.length > 5 && !selected[sku]?.length && <p className="report-period">{t("默认显示销售额最高的 5 个 SKU。")}</p>}
    <Table {...reportCopy.skuTable} fields={[sku, variant, "quantity", "sales"]} rows={filtered} sort="sales" formats={{ sales: money, quantity: number }}/>
  </section>;
}

function DiscountBreakdown({ data, money, number, currency }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Selections>({});
  const bucket = data?.period.bucket ?? "day";
  const all = data?.breakdowns?.discountTimeline;
  const rows = all?.filter(row => matches(row, selected)) ?? null;
  const sales = (row: AnalyticsRow) => salesRow(row, "total_sales__last_non_direct_click" in row).sales;
  const quantity = (row: AnalyticsRow) => dimension(row, "line_type")?.toLowerCase() === "product"
    ? salesRow(row, "net_items_sold__last_non_direct_click" in row).quantity : 0;
  const totals = aggregate(rows, [code], { sales, quantity });
  const detail = aggregate(rows?.filter(row => dimension(row, "line_type")?.toLowerCase() === "product"), [code, ...variantFields], { sales, quantity });
  const points = aggregate(rows, [code, bucket], { sales });
  const formats = { sales: money, quantity: number };
  return <section className="sales-module" id="sales-discounts">
    <div className="section-title"><h2>{t("折扣码表现")}</h2></div>
    <Controls fields={[code, ...variantFields]} selected={selected} setSelected={setSelected}
      options={Object.fromEntries([code, ...variantFields].map(field => [field, choices(all, field, sales)]))}/>
    <div className="report-pair">
      <Breakdown title={t(reportCopy.discountMix.title)} description={t(reportCopy.discountMix.help)} rows={slices(totals, code, "sales")} money={money} emptyLabel={t("未标记")} pie/>
      <TrendChart period={data?.period} title={t(reportCopy.discountTrend.title)} description={t(reportCopy.discountTrend.help)} leftUnit={currency} formatLeft={money}
        series={series(points, code, bucket, "sales", choices(rows, code, sales), t("未标记"), selected[code]?.length || 5)}/>
    </div>
    {totals && totals.length > 5 && !selected[code]?.length && <p className="report-period">{t("趋势默认显示前 5 项，筛选后可查看其他项目。")}</p>}
    <div className="report-pair">
      <Table {...reportCopy.discountTable} fields={[code, "quantity", "sales"]} rows={totals} sort="sales" formats={formats}/>
      <Table {...reportCopy.discountProducts} fields={[code, ...variantFields, "quantity", "sales"]} rows={detail} sort="sales" formats={formats}/>
    </div>
  </section>;
}

const sessionCount = (row: AnalyticsRow) => metricNumber(row.sessions);
const attributedSales = (row: AnalyticsRow) => salesRow(row, true).sales;
const attributedQuantity = (row: AnalyticsRow) => salesRow(row, true).quantity;

function TrafficBreakdown({ data, money, number, percentage }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Selections>({});
  const traffic = data?.breakdowns?.trafficSessions;
  const timeline = data?.breakdowns?.trafficTimeline;
  const sales = data?.breakdowns?.trafficSales;
  const bucket = data?.period.bucket ?? "day";
  const productFiltered = Boolean(selected[sku]?.length || selected[variant]?.length);
  const visits = productFiltered ? null : traffic?.filter(row => matches(row, selected));
  const timelineRows = productFiltered ? null : timeline?.filter(row => matches(row, selected));
  const saleRows = sales?.filter(row => matches(row, selected, { [page]: "page_path" }));
  const products = saleRows?.filter(row => dimension(row, "line_type")?.toLowerCase() === "product");
  const byCampaign = aggregate(visits, ["utm_campaign"], { sessions: sessionCount });
  const byPage = aggregate(visits, [page], { sessions: sessionCount });
  const byChannelTime = aggregate(timelineRows, ["referring_channel", bucket], { sessions: sessionCount });
  const byPageTime = aggregate(timelineRows, [page, bucket], { sessions: sessionCount });
  const byUtmVisits = aggregate(visits, trafficFields, {
    sessions: sessionCount, bounces: row => metricNumber(row.bounces),
    durationTotal: row => {
      const count = sessionCount(row), duration = metricNumber(row.average_session_duration);
      return count === 0 ? 0 : count !== null && duration !== null ? count * duration : null;
    },
    cart: row => metricNumber(row.sessions_with_cart_additions),
    checkout: row => metricNumber(row.sessions_that_reached_checkout),
  });
  const byUtmSales = aggregate(saleRows, trafficFields, { sales: attributedSales, quantity: attributedQuantity });
  const combined = new Map<string, AnalyticsRow>();
  for (const row of [...(byUtmVisits ?? []), ...(byUtmSales ?? [])]) {
    const key = JSON.stringify(trafficFields.map(field => row[field]));
    combined.set(key, { ...combined.get(key), ...row });
  }
  const utmRows = byUtmVisits || byUtmSales ? [...combined.values()].map(row => {
    const count = sessionCount(row), bounces = metricNumber(row.bounces), duration = metricNumber(row.durationTotal);
    return { ...row, bounce: count && bounces !== null ? bounces / count : null, duration: count && duration !== null ? duration / count : null };
  }) : null;
  const productRows = aggregate(products, [...trafficFields, ...variantFields], { sales: attributedSales, quantity: attributedQuantity });
  const bySku = aggregate(products, [sku], { sales: attributedSales });
  const productFormats = { sales: money, quantity: number, cart: number, checkout: number };
  const available = Object.fromEntries([...trafficFields, page].map(field => [field, [...new Set([
    ...choices(traffic, field, sessionCount), ...choices(sales, field === page ? "page_path" : field, attributedSales),
  ])]]));
  for (const field of variantFields) available[field] = choices(sales, field, attributedSales);
  const rankedChannels = choices(timelineRows, "referring_channel", sessionCount);
  const rankedPages = choices(byPage, page, sessionCount);
  return <section className="sales-module" id="sales-traffic">
    <div className="section-title"><h2>{t("流量表现")}</h2></div>
    <Controls fields={[...trafficFields, ...variantFields, page]} selected={selected} setSelected={setSelected} options={available}/>
    <p className="report-period">{t("销售与净销量按末次非直接点击归因。流量按 Shopify 会话来源及落地页统计。")}</p>
    {productFiltered && <p className="scope-note">{t("Shopify 会话无法按 SKU 或变体筛选。清除商品筛选可查看会话指标。")}</p>}
    <div className="report-pair">
      <Breakdown title={t(reportCopy.trafficMix.title)} description={t(reportCopy.trafficMix.help)} rows={slices(byCampaign, "utm_campaign", "sessions")} money={number} metricLabel={t("会话")} emptyLabel={t("未标记")} pie/>
      <TrendChart period={data?.period} title={t(reportCopy.trafficTrend.title)} description={t(reportCopy.trafficTrend.help)} leftUnit={t("会话")}
        series={series(byChannelTime, "referring_channel", bucket, "sessions", rankedChannels, t("未标记"), Infinity)}/>
    </div>
    <div className="report-pair">
      <TrendChart period={data?.period} title={t(reportCopy.pageTrend.title)} description={t(reportCopy.pageTrend.help)} leftUnit={t("会话")}
        series={series(byPageTime, page, bucket, "sessions", rankedPages, t("未标记"), selected[page]?.length || 5)}/>
      <Table {...reportCopy.pageTable} compact fields={[page, "sessions"]} rows={byPage} sort="sessions" formats={{ sessions: number }}/>
    </div>
    {rankedPages.length > 5 && !selected[page]?.length && <p className="report-period">{t("趋势默认显示前 5 项，筛选后可查看其他项目。")}</p>}
    <Table {...reportCopy.utmTable} fields={[...trafficFields, "sessions", "bounce", "duration", "cart", "checkout", "quantity", "sales"]}
      rows={utmRows} sort={productFiltered ? "sales" : "sessions"}
      formats={{ ...productFormats, sessions: number, bounce: percentage, duration: value => value == null ? "—" : `${number(Math.round(value))} s` }}/>
    <p className="report-period">{t("Shopify 会话报表不提供按 UTM、SKU 与变体拆分的加购和结账数。")}</p>
    <Table {...reportCopy.utmProducts} fields={[...trafficFields, ...variantFields, "cart", "checkout", "quantity", "sales"]}
      rows={productRows} sort="sales" formats={productFormats}/>
    <Breakdown title={t(reportCopy.trafficSku.title)} description={t(reportCopy.trafficSku.help)} rows={slices(bySku, sku, "sales")} money={money} emptyLabel={t("无 SKU")} pie/>
  </section>;
}

export function SalesBreakdowns(props: Props) {
  return <div className="sales-breakdowns"><SkuBreakdown {...props}/><DiscountBreakdown {...props}/><TrafficBreakdown {...props}/></div>;
}
