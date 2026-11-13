import { UpstreamHttpError } from "../application/upstream-error";

/** 仅供服务端使用的 Shopify Admin GraphQL 客户端。 */

export function isShopifyConfigured() {
  return Boolean(process.env.SHOPIFY_ACCESS_TOKEN && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(process.env.SHOPIFY_STORE_DOMAIN || ""));
}

export async function shopifyRequest<T>(query: string, variables: Record<string, string> = {}, timeout = 12000): Promise<T> {
  const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-07/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN! },
    body: JSON.stringify({ query, variables }), cache: "no-store", signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new UpstreamHttpError(response.status);
  return response.json() as Promise<T>;
}
