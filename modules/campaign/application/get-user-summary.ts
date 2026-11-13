import { normalizeEmail } from "../domain/validation";
import type { CampaignGateway } from "./campaign-gateway";
export function getUserSummary(input: unknown, gateway: CampaignGateway) {
  const email = normalizeEmail(input);
  return email ? gateway.fetchSummary(email) : Promise.resolve({ status: 400, body: { message: "请输入有效的邮箱地址" } });
}
