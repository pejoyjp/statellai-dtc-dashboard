import type { TrendRange } from "../domain/validation";
export type ApiResult = { status: number; body: unknown };
export interface CampaignGateway {
  fetchStats(range: TrendRange): Promise<ApiResult>;
  fetchSummary(email: string): Promise<ApiResult>;
}
