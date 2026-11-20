import assert from "node:assert/strict";
import { test } from "node:test";

test("SKU 色码决定趋势线颜色，其他后缀保持原配色", async () => {
  const { skuLineColor } = await import("../modules/shared/presentation/chart-series");
  assert.equal(skuLineColor("D1-COL-BL"), "#2563eb");
  assert.equal(skuLineColor("d1-col-gy"), "#171717");
  assert.equal(skuLineColor("D1 COL PK"), "#ec4899");
  assert.equal(skuLineColor("D1_COL_RE"), "#dc2626");
  assert.equal(skuLineColor("STORE"), undefined);
  assert.equal(skuLineColor("D1-COL-BLUE"), undefined);
});

test("折线按时间连续平滑，缺失点会断开", async () => {
  const { smoothLine } = await import("../modules/shared/presentation/chart-series");
  const path = smoothLine([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
  assert.match(path, /^M0 0C/);
  assert.match(path, /20 0$/);
  const gapped = smoothLine([{ x: 0, y: 1 }, { x: 10, y: 2 }, { x: 20, y: null }, { x: 30, y: 3 }, { x: 40, y: 4 }]);
  assert.equal(gapped.match(/M/g)?.length, 2);
});

test("悬浮卡片按指标从大到小，缺失值放在最后", async () => {
  const { tooltipOrder } = await import("../modules/shared/presentation/chart-series");
  assert.deepEqual(tooltipOrder([
    { label: "a", value: 2 },
    { label: "b", value: null },
    { label: "c", value: 9 },
    { label: "d", value: 9 },
  ]).map(item => item.label), ["c", "d", "a", "b"]);
});

test("列表点击列后先降序再升序，缺失值始终置底", async () => {
  const { nextSort, sortAnalyticsRows } = await import("../modules/commerce/presentation/table-summary");
  assert.deepEqual(nextSort({ field: "sales", direction: "desc" }, "quantity"), { field: "quantity", direction: "desc" });
  assert.deepEqual(nextSort({ field: "quantity", direction: "desc" }, "quantity"), { field: "quantity", direction: "asc" });
  const rows = [{ sku: "b", sales: 5 }, { sku: "a", sales: null }, { sku: "c", sales: 20 }];
  assert.deepEqual(sortAnalyticsRows(rows, "sales", "desc", true).map(row => row.sku), ["c", "b", "a"]);
  assert.deepEqual(sortAnalyticsRows(rows, "sales", "asc", true).map(row => row.sku), ["b", "c", "a"]);
  assert.deepEqual(sortAnalyticsRows(rows, "sku", "desc", false).map(row => row.sku), ["c", "b", "a"]);
});

test("列表总和累加金额，比率按会话加权，缺失不记为零", async () => {
  const { columnTotal } = await import("../modules/commerce/presentation/table-summary");
  const rows = [
    { sessions: 10, sales: 100, bounce: 0.2, duration: null },
    { sessions: 30, sales: null, bounce: 0.5, duration: null },
  ];
  assert.equal(columnTotal(rows, "sales"), 100);
  assert.equal(columnTotal(rows, "bounce", "sessions"), 0.425);
  assert.equal(columnTotal(rows, "duration", "sessions"), null);
  assert.equal(columnTotal([{ sales: null }], "sales"), null);
});
