import type { TrendRange } from "../domain/validation";
import type { ApiResult, CampaignGateway } from "../application/campaign-gateway";
export async function fetchCampaignStats(range: TrendRange): Promise<ApiResult> {
  const base = process.env.CAMPAIGN_API_URL, key = process.env.DASHBOARD_API_KEY;
  if (!base || !key) return { status: 503, body: { message: "请配置活动服务器地址和 Dashboard API Key" } };
  const params = new URLSearchParams({ granularity: range.granularity, [range.granularity === "hour" ? "hours" : "days"]: String(range.value) });
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/dashboard/stats?${params}`, { headers: { "x-dashboard-key": key }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) return { status: response.status, body: { message: response.status === 401 ? "活动统计 API Key 无效" : response.status === 404 ? "活动服务器未配置统计 API Key 或接口不可用" : response.status === 429 ? "活动服务器请求过于频繁，请稍后重试" : "活动统计接口暂时不可用" } };
    return { status: 200, body: await response.json() };
  } catch { return { status: 502, body: { message: "无法连接活动统计服务器" } }; }
}
export async function fetchCampaignSummary(email: string): Promise<ApiResult> {
  const base = process.env.CAMPAIGN_API_URL;
  if (!base) return { status: 503, body: { message: "活动接口尚未配置" } };
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/campaign/users/${encodeURIComponent(email)}/summary`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.status === 404) return { status: 404, body: { message: "该邮箱尚未注册活动" } };
    if (!response.ok) return { status: response.status >= 500 ? 502 : response.status, body: { message: "活动查询暂时不可用，请稍后重试" } };
    return { status: 200, body: await response.json() };
  } catch { return { status: 502, body: { message: "无法连接活动服务器" } }; }
}

export const campaignGateway: CampaignGateway = { fetchStats: fetchCampaignStats, fetchSummary: fetchCampaignSummary };

export async function fetchCampaignJourney(scope: import("../domain/journey").JourneyScope): Promise<ApiResult> {
  const base = process.env.CAMPAIGN_API_URL, key = process.env.DASHBOARD_API_KEY;
  if (!base || !key) return { status: 503, body: null };
  const params = new URLSearchParams({ view: "journey", start: scope.start, end: scope.end });
  for (const email of scope.excludeEmails) params.append("excludeEmail", email);
  for (const domain of scope.excludeDomains) params.append("excludeDomain", domain);
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/dashboard/stats?${params}`, {
      headers: { "x-dashboard-key": key }, cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    return { status: response.status, body: response.ok ? await response.json() : null };
  } catch {
    return { status: 502, body: null };
  }
}
