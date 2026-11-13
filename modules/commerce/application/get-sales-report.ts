import { resolveReportingPeriod, type ReportingPeriod } from "@/modules/shared/domain/reporting-period";
import { adjustedSales, metricNumber, parseSalesFilters, salesDimensions, type AnalyticsRow, type SalesDimension, type SalesFilters, type SalesReport } from "../domain/sales-report";

type Tables = Record<string, AnalyticsRow[] | null>;
type Shop = { currencyCode: string; ianaTimezone: string; scopes: string[] };

export interface SalesReportGateway {
  getShop(): Promise<Shop>;
  getInternalEmails(): string[];
  fetchTables(period: ReportingPeriod, filters: SalesFilters, emails: string[], orderHistoryUnavailable: boolean):
    Promise<{ tables: Tables; breakdowns?: Tables; sessionChannelUnavailable: boolean }>;
  getOptions(tables: Tables, dimension: SalesDimension): string[] | null;
}

const stringValue = (value: unknown) => typeof value === "string" && value.trim() ? value : null;
const mapSlices = (rows: AnalyticsRow[] | null, column: string) => rows?.map(row => ({
  label: stringValue(row[column]), sales: adjustedSales(row),
})).sort((a, b) => (b.sales ?? -Infinity) - (a.sales ?? -Infinity)) ?? null;

function timeValues(rows: AnalyticsRow[] | null, bucket: ReportingPeriod["bucket"], map: (row: AnalyticsRow) => number | null) {
  return new Map((rows ?? []).flatMap(row => {
    const time = stringValue(row[bucket]);
    return time ? [[time, map(row)] as const] : [];
  }));
}

export async function getSalesReport(params: URLSearchParams, gateway: SalesReportGateway) {
  const filters = parseSalesFilters(params);
  if (!filters) return { status: 400, body: { message: "统计筛选条件无效" } };
  try {
    const [shop, internalEmails] = await Promise.all([gateway.getShop(), Promise.resolve().then(gateway.getInternalEmails)]);
    const now = new Date();
    const period = resolveReportingPeriod(params, shop.ianaTimezone, now);
    if (!period) return { status: 400, body: { message: "统计周期无效" } };
    const orderHistoryUnavailable = now.getTime() - Date.parse(period.startUtc) > 60 * 86400000 &&
      !shop.scopes.includes("read_all_orders");
    const { tables, breakdowns, sessionChannelUnavailable } = period.endUtc < period.startUtc
      ? { tables: {}, breakdowns: {}, sessionChannelUnavailable: false }
      : await gateway.fetchTables(period, filters, internalEmails, orderHistoryUnavailable);
    const sales = timeValues(tables.salesTrend, period.bucket, adjustedSales);
    const sessions = timeValues(tables.sessionTrend, period.bucket, row => metricNumber(row.sessions));
    const times = [...new Set([...sales.keys(), ...sessions.keys()])].sort();
    const sessionMetrics = tables.sessions?.[0];
    const sessionCount = metricNumber(sessionMetrics?.sessions);
    function sessionRate(column: string) {
      const count = metricNumber(sessionMetrics?.[column]);
      return sessionCount && sessionCount > 0 && count !== null ? count / sessionCount : null;
    }
    const report: SalesReport = {
      breakdowns: breakdowns ?? {},
      period, currency: shop.currencyCode, internalEmails,
      options: Object.fromEntries(salesDimensions.map(key => [key, gateway.getOptions(tables, key)])) as SalesReport["options"],
      metrics: {
        sales: tables.sales?.[0] ? adjustedSales(tables.sales[0]) : null,
        orders: metricNumber(tables.orderMetrics?.[0]?.orders),
        aov: metricNumber(tables.customerMetrics?.[0]?.average_order_value),
        newCustomers: metricNumber(tables.customerMetrics?.[0]?.new_customers),
        sessions: sessionCount,
        conversion: sessionRate("sessions_that_completed_checkout"),
        bounce: sessionRate("bounces"),
      },
      trend: times.map(time => ({ time, sales: sales.get(time) ?? null, sessions: sessions.get(time) ?? null })),
      channels: mapSlices(tables.channels, "sales_channel"),
      discounts: mapSlices(tables.discounts, "discount_code"),
      sku: tables.sku?.map(row => ({
        sku: stringValue(row.product_variant_sku), variant: stringValue(row.product_variant_title),
        quantity: metricNumber(row.net_items_sold), sales: adjustedSales(row),
      })).sort((a, b) => (b.sales ?? -Infinity) - (a.sales ?? -Infinity)) ?? null,
      skuTrend: tables.skuTrend?.flatMap(row => {
        const sku = stringValue(row.product_variant_sku), time = stringValue(row[period.bucket]);
        return sku && time ? [{ sku, time, sales: adjustedSales(row) }] : [];
      }) ?? null,
      sessionChannelUnavailable, orderHistoryUnavailable,
    };
    return { status: 200, body: report };
  } catch {
    return { status: 502, body: { message: "无法获取看板数据，请稍后重试。" } };
  }
}
