import { classifyInternalEmail } from "@/modules/shared/domain/internal-emails";

export type ActivityCounts = Partial<Record<
  "registrations" | "draws" | "players" | "wins" | "misses" | "cappedUsers" | "popupOpens" | "emailCompletions",
  number
>>;

export type ActivityStats = {
  generatedAt?: string;
  timezone?: string;
  limit?: number;
  totals?: ActivityCounts;
  today?: ActivityCounts;
  rates?: { playRate?: number; winRate?: number };
  prizes?: Record<string, { total?: number; today?: number }>;
  prizeRules?: Record<string, { discountAmount: number; minimumSpend: number; discountCode: string }>;
  series?: { bucket: string; registrations: number; draws: number; wins: number }[];
  recent?: { type: string; at: string; email: string; prize?: string | null }[];
};

export function withActivityEmailReview(stats: ActivityStats, confirmed: string[]) {
  const internalEmails = new Set(confirmed);
  const suspectedEmails = new Set<string>();
  const recent = Array.isArray(stats.recent) ? stats.recent.filter(event => {
    if (!event || typeof event.email !== "string" || !Number.isFinite(Date.parse(event.at))) return false;
    const email = event.email.trim().toLowerCase();
    const status = classifyInternalEmail(email, confirmed);
    if (status === "excluded") internalEmails.add(email);
    if (status === "suspected") suspectedEmails.add(email);
    return status !== "excluded";
  }) : undefined;
  return { ...stats, recent, internalEmails: [...internalEmails].sort(), suspectedEmails: [...suspectedEmails].sort() };
}
