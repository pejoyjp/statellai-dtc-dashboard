import { dimension } from "../domain/report-breakdowns";
import { metricNumber, type AnalyticsRow } from "../domain/sales-report";

export type SortDirection = "asc" | "desc";
export type ColumnSort = { field: string; direction: SortDirection };

export function nextSort(current: ColumnSort, field: string): ColumnSort {
  if (current.field !== field) return { field, direction: "desc" };
  return { field, direction: current.direction === "desc" ? "asc" : "desc" };
}

export function sortAnalyticsRows(rows: AnalyticsRow[], field: string, direction: SortDirection, numeric: boolean) {
  return [...rows].sort((left, right) => {
    const leftValue = numeric ? metricNumber(left[field]) : dimension(left, field);
    const rightValue = numeric ? metricNumber(right[field]) : dimension(right, field);
    if (leftValue === null || rightValue === null) return Number(leftValue === null) - Number(rightValue === null);
    const order = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), "en", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? order : -order;
  });
}

export function columnTotal(rows: AnalyticsRow[], field: string, weightField?: string) {
  if (weightField) {
    let weighted = 0;
    let weight = 0;
    for (const row of rows) {
      const value = metricNumber(row[field]);
      const weightValue = metricNumber(row[weightField]);
      if (value === null || weightValue === null || weightValue <= 0) continue;
      weighted += value * weightValue;
      weight += weightValue;
    }
    return weight ? weighted / weight : null;
  }
  let sum = 0;
  let seen = false;
  for (const row of rows) {
    const value = metricNumber(row[field]);
    if (value === null) continue;
    sum += value;
    seen = true;
  }
  return seen ? sum : null;
}
