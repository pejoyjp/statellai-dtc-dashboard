import { NextResponse } from "next/server";
import { getUserSummary } from "@/modules/campaign/application/get-user-summary";
import { campaignGateway } from "@/modules/campaign/infrastructure/campaign-api";
export async function POST(request: Request) {
  let body: { email?: unknown } | null;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "请求格式无效" }, { status: 400 }); }
  const result = await getUserSummary(body?.email, campaignGateway);
  return NextResponse.json(result.body, { status: result.status });
}
