import { internalEmailDomains } from "@/modules/shared/domain/internal-emails";
import type { ReportingPeriod } from "@/modules/shared/domain/reporting-period";
import { shopifyRequest } from "@/modules/shared/infrastructure/shopify-client";
import { salesDimensions, type AnalyticsRow, type SalesDimension, type SalesFilters } from "../domain/sales-report";

import { attributionSuffix, utmFields, variantFields } from "../domain/report-breakdowns";

const utmColumns = { campaign: "utm_campaign", source: "utm_source", medium: "utm_medium" };
const onlineStore = "Online Store";
const moneyMetrics = "total_sales, total_sales_reversals";
const variantColumns = variantFields.join(", ");
const attribution = "LAST_NON_DIRECT_CLICK_ATTRIBUTION";

type Dataset = "sales" | "sessions";
type Queries = Record<string, string>;
type Tables = Record<string, AnalyticsRow[] | null>;
const quote = (value: string) => "'" + value.replaceAll("\\", "\\\\").replaceAll("'", "\\'") + "'";
const inList = (values: string[]) => "(" + values.map(quote).join(", ") + ")";

export function reportWhere(filters: SalesFilters, internalEmails: string[], dataset: Dataset) {
  const predicates = ["customer_email_domain NOT IN " + inList(internalEmailDomains)];
  if (internalEmails.length) predicates.push("customer_email NOT IN " + inList(internalEmails));
  for (const dimension of ["campaign", "source", "medium"] as const) {
    if (filters[dimension].length) predicates.push(utmColumns[dimension] + " IN " + inList(filters[dimension]));
  }
  if (filters.channel.length) {
    predicates.push(dataset === "sales"
      ? "sales_channel IN " + inList(filters.channel)
      : "session_api_client IN " + inList([onlineStore]));
  }
  return predicates.join(" AND ");
}

const pageSize = 250;
const maxRows = 5000;

async function execute(queries: Queries): Promise<Tables> {
  const keys = Object.keys(queries);
  if (!keys.length) return {};
  const response = await shopifyRequest<{ data?: Record<string, {
    tableData?: { rows?: AnalyticsRow[] };
    parseErrors?: unknown[];
  } | null> }>(`query SalesReport(${keys.map(key => `$${key}: String!`).join(", ")}) {
    ${keys.map(key => `${key}: shopifyqlQuery(query: $${key}) { tableData { rows } parseErrors }`).join("\n")}
  }`, queries);
  return Object.fromEntries(keys.map(key => {
    const table = response.data?.[key];
    const rows = table?.tableData?.rows;
    return [key, !table?.parseErrors?.length && Array.isArray(rows) ? rows : null];
  }));
}

async function paginate(queries: Queries, paged: Queries) {
  const firstPage = Object.fromEntries(Object.entries(paged).map(([key, query]) => [key, query + ` LIMIT ${pageSize}`]));
  const tables = await execute({ ...queries, ...firstPage });
  let remaining = Object.keys(paged).filter(key => tables[key]?.length === pageSize);
  for (let offset = pageSize; remaining.length && offset <= maxRows; offset += pageSize) {
    const next = await execute(Object.fromEntries(remaining.map(key => [key, paged[key] + ` LIMIT ${pageSize} OFFSET ${offset}`])));
    for (const key of remaining) {
      const rows = next[key];
      tables[key] = rows && offset + rows.length <= maxRows ? [...(tables[key] ?? []), ...rows] : null;
    }
    remaining = remaining.filter(key => tables[key] && next[key]?.length === pageSize);
  }
  return tables;
}

export async function fetchSalesTables(period: ReportingPeriod, filters: SalesFilters, internalEmails: string[], orderHistoryUnavailable: boolean) {
  const sessionChannelUnavailable = filters.channel.length > 0 && !filters.channel.includes(onlineStore);
  const bounds = `SINCE ${period.start} UNTIL ${period.end}`;
  const timeZone = `TIMEZONE ${quote(period.timezone)}`;
  const hasUtm = filters.campaign.length || filters.source.length || filters.medium.length;
  const queries: Queries = {};
  const paged: Queries = {};

  function add(key: string, dataset: Dataset, metrics: string, where: string, grouping = "", order = "", extra = "") {
    const predicate = [where, extra].filter(Boolean).join(" AND ");
    const model = dataset === "sales" && hasUtm && !key.endsWith("Options") ? `, ${attribution}` : "";
    const query = `FROM ${dataset} SHOW ${metrics}${predicate ? " WHERE " + predicate : ""}${grouping ? " " + grouping : ""} WITH ${timeZone}${model} ${bounds}`;
    if (order) paged[key] = query + " ORDER BY " + order;
    else queries[key] = query;
  }

  const salesWhere = reportWhere(filters, internalEmails, "sales");
  const sessionsWhere = reportWhere(filters, internalEmails, "sessions");
  const optionsWhere = reportWhere({ channel: [], campaign: [], source: [], medium: [] }, internalEmails, "sales");
  const series = `TIMESERIES ${period.bucket}`;

  add("sales", "sales", moneyMetrics, salesWhere);
  add("salesTrend", "sales", moneyMetrics, salesWhere, series, period.bucket);
  add("customerMetrics", "sales", "average_order_value, new_customers", salesWhere);
  if (!orderHistoryUnavailable) add("orderMetrics", "sales", "orders", salesWhere, "", "", "is_canceled_order IS NOT TRUE AND is_sales_reversal IS NOT TRUE");
  if (!sessionChannelUnavailable) {
    add("sessions", "sessions", "sessions, sessions_that_completed_checkout, bounces", sessionsWhere);
    add("sessionTrend", "sessions", "sessions", sessionsWhere, series, period.bucket);
  }
  add("channels", "sales", moneyMetrics, salesWhere, "GROUP BY sales_channel", "sales_channel");
  add("discounts", "sales", moneyMetrics, salesWhere, "GROUP BY discount_code", "discount_code", "discount_code IS NOT NULL");
  add("sku", "sales", `${moneyMetrics}, net_items_sold`, salesWhere, "GROUP BY " + variantColumns, variantColumns, "line_type = 'Product'");
  add("skuTrend", "sales", moneyMetrics, salesWhere, `GROUP BY product_variant_sku ${series}`, `${period.bucket}, product_variant_sku`, "line_type = 'Product' AND product_variant_sku IS NOT NULL");
  for (const dimension of salesDimensions) {
    const column = dimension === "channel" ? "sales_channel" : utmColumns[dimension];
    add(`${dimension}Options`, "sales", "total_sales", optionsWhere, "GROUP BY " + column, column, column + " IS NOT NULL");
    if (dimension !== "channel") {
      add(`${dimension}SessionOptions`, "sessions", "sessions", optionsWhere, "GROUP BY " + column, column, column + " IS NOT NULL");
    }
  }

  const breakdownQueries: Queries = {};
  function breakdown(key: string, dataset: Dataset, metrics: string, fields: string[], extra = "", timeseries = false, attributed = false) {
    const where = [dataset === "sales" ? salesWhere : sessionsWhere, extra].filter(Boolean).join(" AND ");
    const model = attributed ? `, ${attribution}` : "";
    const order = (timeseries ? [period.bucket, ...fields] : fields).join(", ");
    breakdownQueries[key] = `FROM ${dataset} SHOW ${metrics} WHERE ${where} GROUP BY ${fields.join(", ")} ${timeseries ? series : ""} WITH ${timeZone}${model} ${bounds} ORDER BY ${order}`;
  }
  const salesMetrics = `${moneyMetrics}, net_items_sold`;
  const productOnly = "line_type = 'Product'";
  breakdown("skuTimeline", "sales", moneyMetrics, [...variantFields], productOnly, true, Boolean(hasUtm));
  breakdown("discountTimeline", "sales", salesMetrics, ["discount_code", ...variantFields, "line_type"], "discount_code IS NOT NULL", true, Boolean(hasUtm));
  if (!sessionChannelUnavailable) {
    breakdown("trafficSessions", "sessions", "sessions, bounces, average_session_duration, sessions_with_cart_additions, sessions_that_reached_checkout",
      ["referring_channel", ...utmFields, "landing_page_path"]);
    breakdown("trafficTimeline", "sessions", "sessions", [...utmFields, "landing_page_path", "referring_channel"], "", true);
  }
  breakdown("trafficSales", "sales", salesMetrics, ["referring_channel", ...utmFields, "page_path", ...variantFields, "line_type"], "", false, true);

  const [tables, breakdowns] = await Promise.all([
    paginate(queries, paged),
    paginate({}, breakdownQueries).catch(() => ({})),
  ]);
  if (hasUtm) {
    for (const [key, rows] of Object.entries(tables)) {
      if (!rows || key.endsWith("Options")) continue;
      tables[key] = rows.map(row => Object.fromEntries(Object.entries(row).map(([field, value]) =>
        [field.endsWith(attributionSuffix) ? field.slice(0, -attributionSuffix.length) : field, value])));
    }
  }
  return { tables, breakdowns, sessionChannelUnavailable };
}

export function optionValues(tables: Tables, dimension: SalesDimension) {
  const first = tables[`${dimension}Options`];
  const second = tables[`${dimension}SessionOptions`];
  if (!first && !second) return null;
  const column = dimension === "channel" ? "sales_channel" : utmColumns[dimension];
  const values = [...(first ?? []), ...(second ?? [])].map(row => row[column]);
  return [...new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())))].sort();
}
