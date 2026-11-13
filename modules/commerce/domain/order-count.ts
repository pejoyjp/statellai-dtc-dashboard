/** 活动开始于 2026-11-12 15:00（北京时间）。 */
export const CAMPAIGN_START_UTC = "2026-11-12T07:00:00Z";
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export function resolveOrderCount(scopes: string[], count: { count: number; precision: string } | null | undefined, now: number) {
  const needsAllOrders = now - Date.parse(CAMPAIGN_START_UTC) > SIXTY_DAYS_MS;
  const exact = count?.precision === "EXACT" && typeof count.count === "number";
  const available = scopes.includes("read_orders") && (!needsAllOrders || scopes.includes("read_all_orders")) && exact;
  const error = available ? null : needsAllOrders && !scopes.includes("read_all_orders")
    ? "活动开始时间超过 60 天，需要 read_all_orders 权限才能显示完整订单数。"
    : "未能获取准确的有效订单数，请检查 Shopify 订单读取权限。";
  return { count: available ? String(count!.count) : null, error };
}
