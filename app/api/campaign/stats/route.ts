import { NextResponse } from "next/server";
import { getCampaignStats } from "@/modules/campaign/application/get-campaign-stats";
import { campaignGateway } from "@/modules/campaign/infrastructure/campaign-api";
export async function GET(request: Request) {
  const result = await getCampaignStats(new URL(request.url).searchParams, campaignGateway);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
