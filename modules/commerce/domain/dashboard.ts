export type AnalyticsTable = { tableData: { rows: Record<string, string>[] } | null; parseErrors: unknown[] };
export type DashboardData = {
  shop: { name: string; currencyCode: string };
  currentAppInstallation: { accessScopes: { handle: string }[] };
  activeOrders: { count: number; precision: string } | null;
  sales: AnalyticsTable; trend: AnalyticsTable; sessions: AnalyticsTable;
};
export type DashboardResponse = { data?: DashboardData; errors?: { path?: string[] }[] };
