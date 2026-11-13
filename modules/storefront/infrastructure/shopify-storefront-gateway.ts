import type { PerformanceResponse, StorefrontGateway } from "../application/storefront-gateway";
import { isShopifyConfigured, shopifyRequest } from "@/modules/shared/infrastructure/shopify-client";
const shopifyql = "FROM web_performance SHOW page_loads, lcp_p75_ms, inp_p75_ms, p75_cls, ttfb_p75_ms SINCE -29d WITH TIMEZONE 'Asia/Shanghai'";
type ShopResponse = { data?: { shop?: { primaryDomain?: { url?: string } } } };
export const shopifyStorefrontGateway: StorefrontGateway = {
  isConfigured: isShopifyConfigured,
  fetchPerformance: () => shopifyRequest<PerformanceResponse>("query Performance($query: String!) { shopifyqlQuery(query: $query) { tableData { rows } parseErrors } }", { query: shopifyql }),
  async fetchPrimaryDomain() { return (await shopifyRequest<ShopResponse>("{ shop { primaryDomain { url } } }", {}, 10000)).data?.shop?.primaryDomain?.url; },
  async checkHomepage(origin) { const response = await fetch(origin, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0 (compatible; StorefrontAvailabilityCheck/1.0)" } }); return { status: response.status, url: response.url }; },
};
