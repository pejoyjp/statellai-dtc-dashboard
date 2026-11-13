import { resolveOrderCount } from "../domain/order-count";
import { UpstreamHttpError } from "@/modules/shared/application/upstream-error";
import type { DashboardGateway } from "./dashboard-gateway";

export async function getDashboard(gateway: DashboardGateway) {
  if (!gateway.isConfigured()) return { status: "unconfigured", message: "请配置 Shopify 店铺域名和访问令牌。" };
  try {
    const result = await gateway.fetchDashboard();
    if (result.errors?.some(error => error.path?.[0] !== "activeOrders") || !result.data) return { status: "error", message: "Shopify 分析数据不可用。请检查 read_reports 和受保护客户数据权限。" };
    const data = result.data;
    if ([data.sales, data.trend, data.sessions].some(item => item?.parseErrors?.length)) return { status: "error", message: "Shopify 分析查询未通过，请检查店铺权限与 ShopifyQL 支持情况。" };
    const order = resolveOrderCount(data.currentAppInstallation?.accessScopes?.map(scope => scope.handle) ?? [], data.activeOrders, Date.now());
    const sales = data.sales?.tableData?.rows?.[0] ?? null;
    const mappedSales: Record<string, string | null> | null = sales ? { ...sales, orders: order.count } : null;
    return { status: "connected", shop: data.shop, sales: mappedSales, orderError: order.error, trend: data.trend?.tableData?.rows ?? [], sessions: data.sessions?.tableData?.rows?.[0] ?? null, updatedAt: new Date().toISOString() };
  } catch (error) {
    return { status: "error", message: error instanceof UpstreamHttpError ? `Shopify 请求失败（${error.status}），请检查令牌与店铺配置。` : "无法连接 Shopify，请检查网络后重试。" };
  }
}
