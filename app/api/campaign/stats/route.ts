import { NextResponse } from "next/server";
import { getActivityEmailList } from "@/modules/campaign/application/get-activity-email-list";
import { resolveReportingPeriod } from "@/modules/shared/domain/reporting-period";
import { getCampaignJourney } from "@/modules/campaign/application/get-campaign-journey";
import { withActivityEmailReview, type ActivityStats } from "@/modules/campaign/domain/activity-stats";
import { getCampaignStats } from "@/modules/campaign/application/get-campaign-stats";
import { campaignGateway, fetchCampaignJourney, fetchCampaignStats } from "@/modules/campaign/infrastructure/campaign-api";
import { findReportingEmails, getInternalEmails, getReportingShop } from "@/modules/shared/infrastructure/reporting-settings";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("view") === "emails") {
    let confirmed: string[] = [];
    let configValid = true;
    try {
      confirmed = getInternalEmails();
    } catch {
      configValid = false;
    }
    const list = await getActivityEmailList(async () => {
      const shop = await getReportingShop();
      const period = resolveReportingPeriod(new URLSearchParams(), shop.ianaTimezone);
      return period && period.startUtc <= period.endUtc
        ? findReportingEmails(period)
        : { addresses: [], complete: true };
    }, confirmed);
    return NextResponse.json({ ...list, complete: list.complete && configValid }, { headers: { "Cache-Control": "no-store" } });
  }
  const result = params.get("view") === "journey"
    ? await getCampaignJourney(params, { getShop: getReportingShop, getInternalEmails, findEmails: findReportingEmails, fetchJourney: fetchCampaignJourney, fetchLegacy: () => fetchCampaignStats({ granularity: "day", value: 7 }) })
    : await getCampaignStats(params, campaignGateway);
  let body = result.body;
  if (params.get("view") === "activity" && result.status === 200) {
    let confirmed: string[] = [];
    try {
      confirmed = getInternalEmails();
    } catch {
      // The existing domain rules still apply when the supplemental list is invalid.
    }
    body = withActivityEmailReview(body as ActivityStats, confirmed);
  }
  return NextResponse.json(body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
