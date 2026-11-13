import { adjustedSales, metricNumber, type AnalyticsRow } from "./sales-report";

export type ReportTables = Record<string, AnalyticsRow[] | null>;
export const utmFields = ["utm_source", "utm_medium", "utm_campaign"] as const;
export const variantFields = ["product_variant_sku", "product_variant_title"] as const;
export const attributionSuffix = "__last_non_direct_click";

export function salesRow(row: AnalyticsRow, attributed = false) {
  const suffix = attributed ? attributionSuffix : "";
  return {
    sales: adjustedSales({
      total_sales: row["total_sales" + suffix],
      total_sales_reversals: row["total_sales_reversals" + suffix],
    }),
    quantity: metricNumber(row["net_items_sold" + suffix]),
  };
}

export function dimension(row: AnalyticsRow, key: string) {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function aggregate(rows: AnalyticsRow[] | null | undefined, fields: readonly string[], metrics: Record<string, (row: AnalyticsRow) => number | null>) {
  if (!rows) return null;
  const groups = new Map<string, Record<string, string | number | null>>();
  for (const row of rows) {
    const values = fields.map(field => dimension(row, field));
    const key = JSON.stringify(values);
    const current = groups.get(key);
    const group = current ?? Object.fromEntries(fields.map((field, index) => [field, values[index]]));
    for (const [metric, read] of Object.entries(metrics)) {
      const value = read(row);
      const previous = current?.[metric];
      group[metric] = value === null || previous === null ? null : value + (typeof previous === "number" ? previous : 0);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}
