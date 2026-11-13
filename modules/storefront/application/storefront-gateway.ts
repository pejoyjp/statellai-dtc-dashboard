export type PerformanceResponse = { data?: { shopifyqlQuery?: { tableData: { rows: Record<string, string>[] } | null; parseErrors: unknown[] } }; errors?: unknown[] };
export interface StorefrontGateway {
  isConfigured(): boolean;
  fetchPerformance(): Promise<PerformanceResponse>;
  fetchPrimaryDomain(): Promise<string | undefined>;
  checkHomepage(origin: string): Promise<{ status: number; url: string }>;
}
