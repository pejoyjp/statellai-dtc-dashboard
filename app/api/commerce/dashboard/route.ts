import { NextResponse } from "next/server";
import { getDashboard } from "@/modules/commerce/application/get-dashboard";
import { shopifyDashboardGateway } from "@/modules/commerce/infrastructure/shopify-dashboard-gateway";
export async function GET() { return NextResponse.json(await getDashboard(shopifyDashboardGateway), { headers: { "Cache-Control": "no-store" } }); }
