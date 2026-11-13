"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";
import { FieldHelp } from "@/components/ui/field-help";
import { reportCopy } from "./report-copy";
import { SalesBreakdowns } from "./sales-breakdowns";
import { SalesSectionNav } from "./sales-section-nav";
import { AppliedFilters, FilterOptions } from "./report-filter-options";
import { Card } from "@/components/ui/card";
import { PeriodLabel, RangeFields, useReport, useReportingPeriod } from "@/modules/shared/presentation/reporting-period";
import { salesDimensions, type SalesFilters, type SalesReport } from "../domain/sales-report";
import { Breakdown, TrendChart } from "@/modules/shared/presentation/report-charts";

const emptyFilters: SalesFilters = { channel: [], campaign: [], source: [], medium: [] };
const labels = { channel: "销售渠道", campaign: "UTM Campaign Name", source: "UTM Campaign Source", medium: "UTM Campaign Medium" };
const metrics = [
  ["sales", "总销售额", "Shopify 总销售额加回销售冲销，包含适用的税费与运费。"],
  ["sessions", "在线商店访问次数", "所选范围内 Shopify 记录的在线商店会话次数，同一访客可产生多次会话。"],
  ["conversion", "转化率", "完成结账的会话数 ÷ 在线商店会话总数。"],
  ["aov", "平均订单金额", "Shopify AOV 为扣除折扣后的商品销售额 ÷ 订单数，不计下单后的调整。"],
  ["orders", "订单数", "所选范围内的 Shopify 订单数，排除已取消订单和销售冲销记录。"],
  ["bounce", "跳出率", "只浏览一页就离开的会话数 ÷ 在线商店会话总数。"],
  ["newCustomers", "新客数", "Shopify new_customers。所选结果中完成首次购买的客户人数。"],
] as const;

export default function SalesOverview() {
  const { t, lang } = useLanguage();
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const { range, setRange } = useReportingPeriod();
  const [draft, setDraft] = useState(range);
  const [filters, setFilters] = useState(emptyFilters);
  const [resetCount, setResetCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({ view: "report", ...range });
  for (const key of salesDimensions) for (const value of filters[key]) params.append(key, value);
  const { data, message, loading } = useReport<SalesReport>("/api/commerce/dashboard?" + params, revision);
  const money = (value?: number | null) => value == null || !data ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: data.currency }).format(value);
  const number = (value?: number | null) => value == null ? "—" : value.toLocaleString(locale);
  const percentage = (value?: number | null) => value == null ? "—" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(value);
  const trend = data?.trend ?? [];
  const currency = data?.currency ?? "";

  function apply() {
    setRange(draft);
    setRevision(value => value + 1);
  }

  return <section id="performance" className="report-sales">
    <Card className="sales-global-filter">
    <div className="sales-global-heading"><h2>{t("全局筛选")}</h2><span>{t("适用于下方所有销售报表。")}</span></div>
    <form className="report-filters print-control" data-date-filtered={Boolean(range.start || range.end)} onSubmit={event => { event.preventDefault(); apply(); }}>
      <RangeFields range={draft} period={data?.period} onChange={setDraft}/>
      {salesDimensions.map(dimension => <FilterOptions key={`${dimension}:${resetCount}`} label={labels[dimension]} values={filters[dimension]}
        options={data?.options[dimension]} onChange={values => setFilters(current => ({ ...current, [dimension]: values }))}/>)}
      <div className="report-filter-actions">
        <Button type="submit">{t("应用日期")}</Button>
        <Button type="button" variant="outline" onClick={() => {
          const reset = { start: "", end: "" };
          setDraft(reset); setRange(reset); setFilters(emptyFilters);
          setResetCount(count => count + 1);
          setRevision(value => value + 1);
        }}>{t("重置全部筛选")}</Button>
      </div>
    </form>
    <PeriodLabel period={data?.period}/>
    <AppliedFilters items={[
      ...salesDimensions.map(key => ({ label: labels[key], values: filters[key] })),
      { label: "自定义日期", values: range.start || range.end ? [
        `${(range.start || data?.period.start || "—").replace("T", " ")} – ${range.end ? range.end.replace("T", " ") : t("至今")}`,
      ] : [] },
    ]}/>
    </Card>
    <SalesSectionNav/>
    {loading && <p role="status">{t("正在获取数据")}</p>}
    {message && <p className="activity-error" role="alert">{t(message)}</p>}
    {data && data.period.startUtc > data.period.endUtc && <p className="scope-note">{t("活动尚未开始")}</p>}
    {data && <p className="report-period">{t("会话仅能按 Shopify 已关联的客户邮箱排除。")}</p>}
    {data?.sessionChannelUnavailable && <p className="scope-note">{t("所选销售渠道没有对应的 Shopify 在线商店会话数据。")}</p>}
    <section id="sales-summary" className="sales-module">
    <div className="section-title"><h2>{t("销售概览")}</h2></div>
    <div className="sales-kpis">
      {metrics.map(([key, label, help]) => {
        const value = data?.metrics[key];
        const format = key === "sales" || key === "aov" ? money : key === "bounce" || key === "conversion" ? percentage : number;
        return <Card className={key === "sales" ? "sales-kpi sales-kpi-primary" : "sales-kpi"} key={key}>
          <div>{t(label)} <FieldHelp label={`${t(label)} · ${t("指标说明")}`} description={t(help)}/></div>
          <strong>{format(value)}</strong>
          {key === "orders" && data?.orderHistoryUnavailable && <small>{t("统计起点超过 60 天，需 read_all_orders 权限。")}</small>}
        </Card>;
      })}
    </div>
    <div className="report-pair">
      <TrendChart period={data?.period} title={t(reportCopy.overviewTrend.title)} description={t(reportCopy.overviewTrend.help)} leftUnit={currency} formatLeft={money} rightUnit={t("会话")} series={[
        { label: t("总销售额"), points: trend.map(row => ({ time: row.time, value: row.sales })) },
        { label: t("在线商店访问次数"), kind: "bars", points: trend.map(row => ({ time: row.time, value: row.sessions })) },
      ]}/>
      <Breakdown title={t(reportCopy.overviewMix.title)} description={t(reportCopy.overviewMix.help)} rows={data?.channels} money={money} emptyLabel={t("未标记")} pie/>
    </div>

    </section>
    <SalesBreakdowns key={resetCount} data={data} money={money} number={number} percentage={percentage}/>
  </section>;
}
