export type PerformanceStatus = "missing" | "good" | "moderate" | "poor";
export function classifyPerformance(value: number | null, good: number, poor: number): PerformanceStatus {
  return value === null ? "missing" : value <= good ? "good" : value <= poor ? "moderate" : "poor";
}
