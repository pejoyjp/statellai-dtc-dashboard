import { test } from "node:test";
import assert from "node:assert/strict";

test("同一活动时刻按店铺时区显示，自定义范围拒绝无效和夏令时歧义", async () => {
  const { resolveReportingPeriod } = await import("../modules/shared/domain/reporting-period");
  const now = new Date("2026-11-13T07:00:00Z");
  const period = resolveReportingPeriod(new URLSearchParams(), "America/Los_Angeles", now);
  assert.deepEqual(period, {
    start: "2026-11-11T23:00:00", end: "2026-11-12T23:00:00",
    startUtc: "2026-11-12T07:00:00.000Z", endUtc: "2026-11-13T07:00:00.000Z",
    timezone: "America/Los_Angeles", bucket: "hour", throughNow: true,
  });
  for (const start of ["2026-02-30T10:00", "2026-03-08T02:30", "2026-11-01T01:30"]) {
    assert.equal(resolveReportingPeriod(new URLSearchParams({ start }), "America/Los_Angeles", now), null);
  }
});

test("销售额加回冲销绝对值，缺失金额保留为缺失", async () => {
  const { adjustedSales } = await import("../modules/commerce/domain/sales-report");
  assert.equal(adjustedSales({ total_sales: "80.09", total_sales_reversals: "-19.91" }), 100);
  assert.equal(adjustedSales({ total_sales: "80.09", total_sales_reversals: "19.91" }), 100);
  assert.equal(adjustedSales({ total_sales: "80.09" }), null);
});

test("销售筛选同维度多选、跨维度交集，并在聚合前排除可识别内部邮箱", async () => {
  const { parseSalesFilters } = await import("../modules/commerce/domain/sales-report");
  const { reportWhere } = await import("../modules/commerce/infrastructure/shopify-sales-report");
  const filters = parseSalesFilters(new URLSearchParams("channel=Online+Store&source=google&source=meta&medium=cpc"));
  assert.ok(filters);
  const where = "customer_email_domain NOT IN ('163.com', 'satellai.com', 'qq.com') AND customer_email NOT IN ('internal@example.com') AND utm_source IN ('google', 'meta') AND utm_medium IN ('cpc')";
  assert.equal(reportWhere(filters, ["internal@example.com"], "sales"), where + " AND sales_channel IN ('Online Store')");
  assert.equal(reportWhere(filters, ["internal@example.com"], "sessions"), where + " AND session_api_client IN ('Online Store')");
});

test("活动接口忽略新过滤参数时不把旧汇总计入所选期间", async () => {
  const { parseJourney } = await import("../modules/campaign/domain/journey");
  const scope = { start: "2026-11-12T07:00:00.000Z", end: "2026-11-13T07:00:00.000Z", excludeEmails: ["internal@example.com"], excludeDomains: ["163.com", "satellai.com", "qq.com"] };
  assert.equal(parseJourney({ totals: { registrations: 100 }, recent: [] }, scope), null);
  assert.equal(parseJourney({ scope: { ...scope, excludeEmails: [] }, totals: { popupOpens: 8, emailCompletions: 4 } }, scope), null);
  assert.deepEqual(parseJourney({ scope, totals: { popupOpens: 8, emailCompletions: 0 } }, scope)?.totals, { popupOpens: 8, emailCompletions: 0 });
});

test("邮箱域名精确匹配，疑似拼音地址只列为候选", async () => {
  const { classifyInternalEmail } = await import("../modules/shared/domain/internal-emails");
  assert.equal(classifyInternalEmail("PERSON@163.COM", []), "excluded");
  assert.equal(classifyInternalEmail("person@sub.qq.com", []), null);
  assert.equal(classifyInternalEmail("wangke@example.com", []), "suspected");
  assert.equal(classifyInternalEmail("wangke@example.com", ["wangke@example.com"]), "excluded");
  assert.equal(classifyInternalEmail("newsletter@example.com", []), null);
});

test("旧活动接口仅恢复当前周期内的外部用户动态及奖品规则", async () => {
  const { getActivityDetails } = await import("../modules/campaign/domain/journey");
  const scope = { start: "2026-11-12T07:00:00.000Z", end: "2026-11-13T07:00:00.000Z", excludeEmails: [], excludeDomains: ["qq.com"] };
  const event = { type: "register", at: scope.start, email: "buyer@example.com" };
  const result = getActivityDetails({
    totals: { registrations: 20 },
    recent: [event, { ...event, email: "test@qq.com" }, { ...event, at: "2026-11-12T06:59:59Z" }],
    prizeRules: { A: { discountAmount: 20, minimumSpend: 100, discountCode: "A20" } },
  }, scope);
  assert.deepEqual(result.recent, [event]);
  assert.equal(result.prizeRules.A.discountCode, "A20");
});

test("商品报表只读取明确归因的列，缺失的商品金额不会被汇总为零", async () => {
  const { aggregate, salesRow } = await import("../modules/commerce/domain/report-breakdowns");
  const attributed = {
    sku: "A", total_sales: "999", total_sales__last_non_direct_click: "30",
    total_sales_reversals__last_non_direct_click: "-10", net_items_sold__last_non_direct_click: "2",
  };
  assert.deepEqual(salesRow(attributed, true), { sales: 40, quantity: 2 });
  assert.deepEqual(aggregate([attributed, { sku: "A", total_sales: "999" }], ["sku"], {
    sales: row => salesRow(row, true).sales,
  }), [{ sku: "A", sales: null }]);
});

test("销售趋势把带时区的 Shopify 时间桶转换成店铺时间，并保留本地日期桶", async () => {
  const { reportingBucketLabel } = await import("../modules/shared/domain/reporting-period");
  assert.equal(reportingBucketLabel("2026-11-12T07:00:00Z", "America/Los_Angeles", "hour"), "2026-11-11 23:00");
  assert.equal(reportingBucketLabel("2026-11-12T08:00:00+01:00", "America/Los_Angeles", "hour"), "2026-11-11 23:00");
  assert.equal(reportingBucketLabel("2026-11-12", "America/Los_Angeles", "day"), "2026-11-12");
  assert.equal(reportingBucketLabel("2026-11-12T00:00:00", "America/Los_Angeles", "week"), "2026-11-12");
});
