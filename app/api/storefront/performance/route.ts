import { NextResponse } from "next/server";
import { getPerformance } from "@/modules/storefront/application/get-performance";
import { shopifyStorefrontGateway } from "@/modules/storefront/infrastructure/shopify-storefront-gateway";
export async function GET() {
  const result = await getPerformance(shopifyStorefrontGateway);
  return NextResponse.json(result.body, { status: result.statusCode, headers: { "Cache-Control": "no-store" } });
}
