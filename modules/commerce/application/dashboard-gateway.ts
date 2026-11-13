import type { DashboardResponse } from "../domain/dashboard";
export interface DashboardGateway {
  isConfigured(): boolean;
  fetchDashboard(): Promise<DashboardResponse>;
}
