import { parseTrendRange } from "../domain/validation";
import type { CampaignGateway } from "./campaign-gateway";
export function getCampaignStats(params: URLSearchParams, gateway: CampaignGateway) {
  const range = parseTrendRange(params);
  return range ? gateway.fetchStats(range) : Promise.resolve({ status: 400, body: { message: "统计周期无效" } });
}
