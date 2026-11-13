export type TrendRange = { granularity: "day" | "hour"; value: number };
export function parseTrendRange(input: URLSearchParams): TrendRange | null {
  const granularity = input.get("granularity") || "day";
  if (granularity !== "day" && granularity !== "hour") return null;
  const value = Number(input.get(granularity === "hour" ? "hours" : "days") || (granularity === "hour" ? 24 : 7));
  return Number.isInteger(value) && value >= 1 && value <= (granularity === "hour" ? 168 : 90) ? { granularity, value } : null;
}
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim();
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
