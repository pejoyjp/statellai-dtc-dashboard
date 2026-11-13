export type JourneyScope = { start: string; end: string; excludeEmails: string[]; excludeDomains: string[] };
export type JourneyTotals = { popupOpens: number; emailCompletions: number };

export function parseJourney(value: unknown, expected: JourneyScope) {
  if (!value || typeof value !== "object") return null;
  const { scope, totals } = value as { scope?: JourneyScope; totals?: JourneyTotals };
  if (scope?.start !== expected.start || scope.end !== expected.end || !Array.isArray(scope.excludeEmails)) return null;
  if (scope.excludeEmails.length !== expected.excludeEmails.length ||
    [...scope.excludeEmails].sort().some((email, index) => email !== expected.excludeEmails[index])) return null;
  if (!Array.isArray(scope.excludeDomains) || scope.excludeDomains.length !== expected.excludeDomains.length ||
    [...scope.excludeDomains].sort().some((domain, index) => domain !== [...expected.excludeDomains].sort()[index])) return null;
  if (!totals || ![totals.popupOpens, totals.emailCompletions].every(count => Number.isSafeInteger(count) && count >= 0)) return null;
  const raw = value as {
    series?: { bucket: string; registrations: number; draws: number; wins: number }[];
    prizes?: Record<string, { total: number }>;
    rates?: { playRate: number; winRate: number };
  };
  const series = Array.isArray(raw.series) ? raw.series.filter(row => row && typeof row.bucket === "string" &&
    [row.registrations, row.draws, row.wins].every(count => Number.isSafeInteger(count) && count >= 0)) : undefined;
  const prizes = Object.fromEntries(["S", "A", "B", "C"].flatMap(tier => {
    const count = raw.prizes?.[tier]?.total;
    return typeof count === "number" && Number.isSafeInteger(count) && count >= 0 ? [[tier, count]] : [];
  }));
  const rates = raw.rates && [raw.rates.playRate, raw.rates.winRate].every(rate => typeof rate === "number" && rate >= 0 && rate <= 1)
    ? { playRate: raw.rates.playRate, winRate: raw.rates.winRate } : undefined;
  return { totals: { popupOpens: totals.popupOpens, emailCompletions: totals.emailCompletions }, supplemental: { series, prizes, rates } };
}

export type ActivityDetails = {
  recent: { type: "register" | "draw"; at: string; email: string; prize?: string }[];
  prizeRules: Record<string, { discountAmount: number; minimumSpend: number; discountCode: string }>;
};

export function getActivityDetails(value: unknown, scope: JourneyScope): ActivityDetails {
  const payload = value as Partial<ActivityDetails> | null;
  const start = Date.parse(scope.start);
  const end = Date.parse(scope.end);
  const excluded = new Set(scope.excludeEmails);
  const domains = new Set(scope.excludeDomains);
  const recent = Array.isArray(payload?.recent) ? payload.recent.filter(event => {
    if (!event || !["register", "draw"].includes(event.type) || typeof event.email !== "string" || typeof event.at !== "string") return false;
    const email = event.email.trim().toLowerCase();
    const at = Date.parse(event.at);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && at >= start && at <= end &&
      !excluded.has(email) && !domains.has(email.split("@")[1]);
  }) : [];
  const prizeRules = Object.fromEntries(["S", "A", "B", "C"].flatMap(tier => {
    const rule = payload?.prizeRules?.[tier];
    return rule && typeof rule.discountCode === "string" && Number.isFinite(rule.discountAmount) &&
      Number.isFinite(rule.minimumSpend) ? [[tier, rule]] : [];
  }));
  return { recent, prizeRules };
}
