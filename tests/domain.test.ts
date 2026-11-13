import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, parseTrendRange } from "../modules/campaign/domain/validation";
import { CAMPAIGN_START_UTC, resolveOrderCount } from "../modules/commerce/domain/order-count";
import { classifyStorefront } from "../modules/storefront/domain/availability";
import { classifyPerformance } from "../modules/storefront/domain/performance";
import { getCampaignStats } from "../modules/campaign/application/get-campaign-stats";
import { getUserSummary } from "../modules/campaign/application/get-user-summary";
import type { CampaignGateway } from "../modules/campaign/application/campaign-gateway";
import { getDashboard } from "../modules/commerce/application/get-dashboard";
import type { DashboardGateway } from "../modules/commerce/application/dashboard-gateway";

const start = Date.parse(CAMPAIGN_START_UTC);
test("订单数只接受精确值，超过 60 天必须具有完整订单权限", () => {
  assert.equal(resolveOrderCount(["read_orders"], { count: 2, precision: "EXACT" }, start + 1000).count, "2");
  assert.equal(resolveOrderCount(["read_orders"], { count: 2, precision: "AT_LEAST" }, start + 1000).count, null);
  assert.equal(resolveOrderCount(["read_orders"], { count: 2, precision: "EXACT" }, start + 61 * 86400000).count, null);
  assert.equal(resolveOrderCount(["read_orders", "read_all_orders"], { count: 2, precision: "EXACT" }, start + 61 * 86400000).count, "2");
});
test("趋势时间范围及邮箱验证", () => {
  assert.deepEqual(parseTrendRange(new URLSearchParams()), { granularity: "day", value: 7 });
  assert.deepEqual(parseTrendRange(new URLSearchParams("granularity=hour&hours=168")), { granularity: "hour", value: 168 });
  assert.equal(parseTrendRange(new URLSearchParams("granularity=hour&hours=169")), null);
  assert.equal(parseTrendRange(new URLSearchParams("granularity=week")), null);
  assert.equal(normalizeEmail("  person@example.com  "), "person@example.com");
  assert.equal(normalizeEmail("bad-email"), null);
});
test("店铺密码页与异常响应不会被误判为可访问", () => {
  assert.equal(classifyStorefront(200, "https://example.com/").status, "available");
  assert.equal(classifyStorefront(200, "https://example.com/password").status, "attention");
  assert.equal(classifyStorefront(503, "https://example.com/").status, "attention");
  assert.equal(classifyPerformance(2500, 2500, 4000), "good");
  assert.equal(classifyPerformance(4000, 2500, 4000), "moderate");
  assert.equal(classifyPerformance(4001, 2500, 4000), "poor");
});
test("活动用例在输入无效时不调用远端", async () => {
  let called = false;
  const gateway: CampaignGateway = { async fetchStats() { called = true; return { status: 200, body: {} }; }, async fetchSummary() { called = true; return { status: 200, body: {} }; } };
  assert.equal((await getCampaignStats(new URLSearchParams("days=91"), gateway)).status, 400);
  assert.equal((await getUserSummary("invalid", gateway)).status, 400);
  assert.equal(called, false);
});
test("订单权限不足不会使销售数据丢失", async () => {
  const table = { tableData: { rows: [{ total_sales: "42" }] }, parseErrors: [] };
  const gateway: DashboardGateway = { isConfigured: () => true, async fetchDashboard() { return { errors: [{ path: ["activeOrders"] }], data: { shop: { name: "test", currencyCode: "USD" }, currentAppInstallation: { accessScopes: [] }, activeOrders: null, sales: table, trend: table, sessions: table } }; } };
  const result = await getDashboard(gateway);
  assert.equal(result.status, "connected");
  assert.equal(result.sales?.total_sales, "42");
  assert.equal(result.sales?.orders, null);
  assert.ok(result.orderError);
});

test("Shopify 销售适配器按活动起点排除已取消订单", async () => {
  const { shopifyDashboardGateway } = await import("../modules/commerce/infrastructure/shopify-dashboard-gateway");
  const oldFetch = globalThis.fetch;
  const oldDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const oldToken = process.env.SHOPIFY_ACCESS_TOKEN;
  let sentQuery = "";
  try {
    process.env.SHOPIFY_STORE_DOMAIN = "example.myshopify.com";
    process.env.SHOPIFY_ACCESS_TOKEN = "test-token";
    globalThis.fetch = async (_input, init) => {
      sentQuery = JSON.parse(String(init?.body)).query;
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    };
    await shopifyDashboardGateway.fetchDashboard();
    assert.match(sentQuery, /-status:cancelled/);
    assert.ok(sentQuery.includes(CAMPAIGN_START_UTC));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldDomain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN; else process.env.SHOPIFY_STORE_DOMAIN = oldDomain;
    if (oldToken === undefined) delete process.env.SHOPIFY_ACCESS_TOKEN; else process.env.SHOPIFY_ACCESS_TOKEN = oldToken;
  }
});
