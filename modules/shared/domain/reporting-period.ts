export const CAMPAIGN_START_UTC = "2026-11-12T07:00:00Z";

export type ReportingPeriod = {
  start: string;
  end: string;
  startUtc: string;
  endUtc: string;
  timezone: string;
  bucket: "hour" | "day" | "week";
  throughNow: boolean;
};

function localTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(date).replace(" ", "T");
}

function fromLocal(value: string, timezone: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(value)) return null;
  const local = value.length === 16 ? value + ":00" : value;
  const nominal = Date.parse(local + "Z");
  if (!Number.isFinite(nominal)) return null;
  const candidates = new Set<number>();
  // Sample offsets on either side of a possible DST transition.
  for (const hours of [-24, 0, 24]) {
    const sample = nominal + hours * 3600000;
    const offset = Date.parse(localTime(new Date(sample), timezone) + "Z") - sample;
    const candidate = nominal - offset;
    if (localTime(new Date(candidate), timezone) === local) candidates.add(candidate);
  }
  return candidates.size === 1 ? new Date([...candidates][0]) : null;
}

export function resolveReportingPeriod(params: URLSearchParams, timezone: string, now = new Date()): ReportingPeriod | null {
  const startInput = params.get("start");
  const endInput = params.get("end");
  const start = startInput ? fromLocal(startInput, timezone) : new Date(CAMPAIGN_START_UTC);
  const end = endInput ? fromLocal(endInput, timezone) : new Date(Math.floor(now.getTime() / 1000) * 1000);
  if (!start || !end || (end < start && (startInput || endInput))) return null;
  const days = (end.getTime() - start.getTime()) / 86400000;
  return {
    start: localTime(start, timezone), end: localTime(end, timezone),
    startUtc: start.toISOString(), endUtc: end.toISOString(), timezone,
    bucket: days <= 3 ? "hour" : days <= 180 ? "day" : "week",
    throughNow: !endInput,
  };
}

export function reportingBucketLabel(value: string, timezone: string, bucket: ReportingPeriod["bucket"]) {
  // Shopify returns date-only and offset-free buckets in the report's local calendar.
  const instant = /[T ].*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? Date.parse(value) : NaN;
  const local = Number.isFinite(instant) ? localTime(new Date(instant), timezone) : value;
  return local.replace("T", " ").slice(0, bucket === "hour" ? 16 : 10);
}
