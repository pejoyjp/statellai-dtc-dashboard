import { NextResponse } from "next/server";
import { getDashboard } from "@/modules/commerce/application/get-dashboard";
import { getSalesReport } from "@/modules/commerce/application/get-sales-report";
import { shopifyDashboardGateway } from "@/modules/commerce/infrastructure/shopify-dashboard-gateway";
import { fetchSalesTables, optionValues } from "@/modules/commerce/infrastructure/shopify-sales-report";
import { getInternalEmails, getReportingShop } from "@/modules/shared/infrastructure/reporting-settings";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("view") === "report") {
    const result = await getSalesReport(params, {
      getShop: getReportingShop, getInternalEmails, fetchTables: fetchSalesTables, getOptions: optionValues,
    });
    return NextResponse.json(result.body, { status: result.status, headers });
  }
  return NextResponse.json(await getDashboard(shopifyDashboardGateway), { headers });
}
