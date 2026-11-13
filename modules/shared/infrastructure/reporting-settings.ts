import { shopifyRequest } from "./shopify-client";

export function getInternalEmails() {
  const entries = (process.env.DASHBOARD_INTERNAL_EMAILS ?? "").split(",")
    .map(value => value.trim().toLowerCase()).filter(Boolean);
  if (entries.some(value => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value))) {
    throw new Error("内部邮箱配置无效");
  }
  return [...new Set(entries)].sort();
}

export async function getReportingShop() {
  const response = await shopifyRequest<{
    data?: {
      shop?: { name: string; currencyCode: string; ianaTimezone: string };
      currentAppInstallation?: { accessScopes: { handle: string }[] };
    };
  }>("query ReportingShop { shop { name currencyCode ianaTimezone } currentAppInstallation { accessScopes { handle } } }");
  const shop = response.data?.shop;
  if (!shop?.ianaTimezone) throw new Error("无法读取 Shopify 店铺时区");
  return { ...shop, scopes: response.data?.currentAppInstallation?.accessScopes.map(item => item.handle) ?? [] };
}

export async function findReportingEmails(period: import("../domain/reporting-period").ReportingPeriod) {
  const pageSize = 500;
  const addresses = new Set<string>();
  const range = `WITH TIMEZONE '${period.timezone}' SINCE ${period.start} UNTIL ${period.end}`;
  const query = `query ReportingEmails($sales: String!, $sessions: String!) {
    sales: shopifyqlQuery(query: $sales) { tableData { rows } parseErrors }
    sessions: shopifyqlQuery(query: $sessions) { tableData { rows } parseErrors }
  }`;
  type Table = { tableData?: { rows?: { customer_email?: unknown }[] }; parseErrors?: unknown[] };
  let complete = false;
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const pagination = `ORDER BY customer_email LIMIT ${pageSize} OFFSET ${offset}`;
    const response = await shopifyRequest<{ data?: { sales?: Table; sessions?: Table } }>(query, {
      sales: `FROM sales SHOW orders WHERE customer_email IS NOT NULL GROUP BY customer_email ${range} ${pagination}`,
      sessions: `FROM sessions SHOW sessions WHERE customer_email IS NOT NULL GROUP BY customer_email ${range} ${pagination}`,
    });
    const tables = [response.data?.sales, response.data?.sessions];
    for (const table of tables) {
      if (table?.parseErrors?.length) continue;
      for (const row of table?.tableData?.rows ?? []) {
        if (typeof row.customer_email === "string") addresses.add(row.customer_email.trim().toLowerCase());
      }
    }
    if (tables.every(table => (table?.tableData?.rows?.length ?? 0) < pageSize)) {
      complete = tables.every(table => !table?.parseErrors?.length && Array.isArray(table?.tableData?.rows));
      break;
    }
  }
  return { addresses: [...addresses], complete };
}
