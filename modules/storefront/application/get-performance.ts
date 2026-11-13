import { UpstreamHttpError } from "@/modules/shared/application/upstream-error";
import type { StorefrontGateway } from "./storefront-gateway";
export async function getPerformance(gateway: StorefrontGateway) {
  if (!gateway.isConfigured()) return { statusCode: 503, body: { status: "unconfigured", message: "请配置 Shopify 店铺域名和访问令牌。" } };
  try {
    const result = await gateway.fetchPerformance();
    if (result.errors?.length) return { statusCode: 502, body: { status: "error", message: "无法读取 Shopify 性能数据，请检查分析权限。" } };
    const data = result.data?.shopifyqlQuery;
    if (!data || data.parseErrors?.length || !data.tableData) return { statusCode: 502, body: { status: "error", message: "Shopify 性能查询暂不可用。" } };
    return { statusCode: 200, body: { status: "connected", metrics: data.tableData.rows?.[0] ?? null, updatedAt: new Date().toISOString() } };
  } catch (error) { return { statusCode: 502, body: { status: "error", message: error instanceof UpstreamHttpError ? `Shopify 性能数据请求失败（${error.status}）。` : "无法连接 Shopify，请稍后重试。" } }; }
}
