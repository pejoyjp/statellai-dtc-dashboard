import { resolveReportingPeriod, type ReportingPeriod } from "@/modules/shared/domain/reporting-period";
import { classifyInternalEmail, internalEmailDomains } from "@/modules/shared/domain/internal-emails";
import { getActivityDetails, parseJourney, type ActivityDetails, type JourneyScope, type JourneyTotals } from "../domain/journey";

export type CampaignJourney = {
  period: ReportingPeriod;
  internalEmails: string[];
  suspectedEmails: string[];
  emailListComplete: boolean;
  totals: JourneyTotals | null;
  message?: string;
  details?: ActivityDetails;
  supplemental?: NonNullable<ReturnType<typeof parseJourney>>["supplemental"];
};

export async function getCampaignJourney(params: URLSearchParams, gateway: {
  getShop(): Promise<{ ianaTimezone: string }>;
  getInternalEmails(): string[];
  findEmails(period: ReportingPeriod): Promise<{ addresses: string[]; complete: boolean }>;
  fetchLegacy(): Promise<{ status: number; body: unknown }>;
  fetchJourney(scope: JourneyScope): Promise<{ status: number; body: unknown }>;
}) {
  let internalEmails: string[] | undefined;
  try {
    internalEmails = gateway.getInternalEmails();
    const shop = await gateway.getShop();
    const period = resolveReportingPeriod(params, shop.ianaTimezone);
    if (!period) return { status: 400, body: { internalEmails, message: "统计周期无效" } };
    const report: CampaignJourney = { period, internalEmails, suspectedEmails: [], emailListComplete: false, totals: null };
    if (period.startUtc > period.endUtc) return { status: 200, body: report };
    const scope = { start: period.startUtc, end: period.endUtc, excludeEmails: internalEmails, excludeDomains: internalEmailDomains };
    const [response, discovered] = await Promise.all([
      gateway.fetchJourney(scope),
      gateway.findEmails(period).catch(() => ({ addresses: [], complete: false })),
    ]);
    const excluded = new Set(internalEmails);
    for (const email of discovered.addresses) {
      const classification = classifyInternalEmail(email, internalEmails);
      if (classification === "excluded") excluded.add(email);
      if (classification === "suspected") report.suspectedEmails.push(email);
    }
    report.internalEmails = [...excluded].sort();
    report.suspectedEmails.sort();
    report.emailListComplete = discovered.complete;
    const journey = response.status === 200 ? parseJourney(response.body, scope) : null;
    if (journey) {
      report.totals = journey.totals;
      report.supplemental = journey.supplemental;
      report.details = getActivityDetails(response.body, scope);
    } else {
      report.message = "活动服务器未返回符合当前时间与邮箱筛选的旅程数据。";
      const legacy = await gateway.fetchLegacy();
      if (legacy.status === 200) report.details = getActivityDetails(legacy.body, scope);
    }
    return { status: 200, body: report };
  } catch {
    return { status: 502, body: { internalEmails, message: "无法获取活动报表。" } };
  }
}
