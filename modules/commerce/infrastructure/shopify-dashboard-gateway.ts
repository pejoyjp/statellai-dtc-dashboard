import { CAMPAIGN_START_UTC } from "../domain/order-count";
import type { DashboardResponse } from "../domain/dashboard";
import type { DashboardGateway } from "../application/dashboard-gateway";
import { isShopifyConfigured, shopifyRequest } from "@/modules/shared/infrastructure/shopify-client";
const queries = {
  sales: "FROM sales SHOW total_sales SINCE 2026-11-12T15:00:00 WITH TIMEZONE 'Asia/Shanghai'",
  trend: "FROM sales SHOW total_sales TIMESERIES day SINCE 2026-11-12T15:00:00 WITH TIMEZONE 'Asia/Shanghai' ORDER BY day ASC",
  sessions: "FROM sessions SHOW sessions SINCE 2026-11-12T15:00:00 WITH TIMEZONE 'Asia/Shanghai'",
};
const query = `query Dashboard($sales: String!, $trend: String!, $sessions: String!) {
  shop { name currencyCode }
  currentAppInstallation { accessScopes { handle } }
  activeOrders: ordersCount(query: "created_at:>='${CAMPAIGN_START_UTC}' -status:cancelled", limit: null) { count precision }
  sales: shopifyqlQuery(query: $sales) { tableData { rows } parseErrors }
  trend: shopifyqlQuery(query: $trend) { tableData { rows } parseErrors }
  sessions: shopifyqlQuery(query: $sessions) { tableData { rows } parseErrors }
}`;
export const shopifyDashboardGateway: DashboardGateway = {
  isConfigured: isShopifyConfigured,
  fetchDashboard: () => shopifyRequest<DashboardResponse>(query, queries),
};
