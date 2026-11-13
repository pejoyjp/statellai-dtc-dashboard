import type { ReportTables } from "./report-breakdowns";
import type { ReportingPeriod } from "../../shared/domain/reporting-period";

export const salesDimensions = ["channel", "campaign", "source", "medium"] as const;
export type SalesDimension = typeof salesDimensions[number];
export type SalesFilters = Record<SalesDimension, string[]>;
export type AnalyticsRow = Record<string, unknown>;

export function parseSalesFilters(params: URLSearchParams): SalesFilters | null {
  const filters: SalesFilters = { channel: [], campaign: [], source: [], medium: [] };
  for (const key of salesDimensions) {
    const values = params.getAll(key);
    if (values.length > 100 || values.some(value => !value.trim() || value.length > 256 || /[\x00-\x1f\x7f]/.test(value))) return null;
    filters[key] = [...new Set(values)];
  }
  return filters;
}

export function metricNumber(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function adjustedSales(row: AnalyticsRow): number | null {
  const total = metricNumber(row.total_sales);
  const reversals = metricNumber(row.total_sales_reversals);
  return total === null || reversals === null ? null : total + Math.abs(reversals);
}

export type Slice = { label: string | null; sales: number | null };
export type SalesReport = {
  period: ReportingPeriod;
  currency: string;
  internalEmails: string[];
  options: Record<SalesDimension, string[] | null>;
  metrics: Record<"sales" | "orders" | "aov" | "newCustomers" | "sessions" | "conversion" | "bounce", number | null>;
  trend: { time: string; sales: number | null; sessions: number | null }[];
  channels: Slice[] | null;
  discounts: Slice[] | null;
  sku: { sku: string | null; variant: string | null; sales: number | null; quantity: number | null }[] | null;
  skuTrend: { sku: string; time: string; sales: number | null }[] | null;
  sessionChannelUnavailable: boolean;
  orderHistoryUnavailable: boolean;
  breakdowns: ReportTables;
};
