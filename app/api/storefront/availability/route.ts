import { NextResponse } from "next/server";
import { getAvailability } from "@/modules/storefront/application/get-availability";
import { shopifyStorefrontGateway } from "@/modules/storefront/infrastructure/shopify-storefront-gateway";
export async function GET() { return NextResponse.json(await getAvailability(shopifyStorefrontGateway), { headers: { "Cache-Control": "no-store" } }); }
