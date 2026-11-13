import { classifyStorefront } from "../domain/availability";
import type { StorefrontGateway } from "./storefront-gateway";
export async function getAvailability(gateway: StorefrontGateway) {
  const checked = () => new Date().toISOString();
  if (!gateway.isConfigured()) return { status: "unknown", message: "店铺配置不完整", checkedAt: checked() };
  try {
    const url = await gateway.fetchPrimaryDomain();
    if (typeof url !== "string") return { status: "unknown", message: "无法获取店铺主域名", checkedAt: checked() };
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return { status: "unknown", message: "店铺主域名无效", checkedAt: checked() };
    try {
      const page = await gateway.checkHomepage(parsed.origin);
      return { ...classifyStorefront(page.status, page.url), url: parsed.origin, httpStatus: page.status, checkedAt: checked() };
    } catch { return { status: "unknown", url: parsed.origin, message: "服务器无法完成首页请求，请检查网络或店铺状态", checkedAt: checked() }; }
  } catch { return { status: "unknown", message: "无法获取店铺主域名，请检查 Shopify 连接", checkedAt: checked() }; }
}
