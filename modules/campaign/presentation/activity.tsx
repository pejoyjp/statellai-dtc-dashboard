"use client";
import { useLanguage } from "@/components/language";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Counts = { registrations: number; draws: number; players: number; wins: number; misses: number; cappedUsers?: number };
type Point = { bucket: string; registrations: number; draws: number; wins: number };
type Stats = { generatedAt: string; campaignStartedAt: string | null; limit: number; totals: Counts; today: Counts; rates: { playRate: number; winRate: number }; prizes: Record<string, { total: number; today: number }>; prizeRules: Record<string, { discountAmount: number; minimumSpend: number; discountCode: string }>; series: Point[]; recent: { type: string; email: string; at: string; prize?: string | null }[] };
const kpis: { key: keyof Counts; label: string }[] = [{ key: "registrations", label: "累计注册" }, { key: "draws", label: "累计抽奖" }, { key: "players", label: "参与人数" }, { key: "wins", label: "中奖次数" }, { key: "misses", label: "未中奖次数" }, { key: "cappedUsers", label: "次数用满人数" }];
const choices = [{ label: "最近 7 天", query: "granularity=day&days=7" }, { label: "最近 30 天", query: "granularity=day&days=30" }, { label: "最近 24 小时", query: "granularity=hour&hours=24" }, { label: "最近 7 天（小时）", query: "granularity=hour&hours=168" }];
function dateTime(date: string) { return new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }); }
function Trend({ series }: { series: Point[] }) {
  const { t } = useLanguage();
  if (!series.length) return <div className="activity-empty">{t('该时段暂无趋势数据')}</div>;
  const max = Math.max(1, ...series.flatMap(p => [p.registrations, p.draws, p.wins]));
  const width = 700, height = 160, pad = 8;
  const coordinates = (key: "registrations" | "draws" | "wins") => series.map((point, i) => `${pad + (series.length === 1 ? 0 : i * (width - 2 * pad) / (series.length - 1))},${height - pad - point[key] / max * (height - 2 * pad)}`).join(" ");
  return <div className="activity-trend"><div className="activity-trend-grid"><span/><span/><span/><span/></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={t("注册量、抽奖次数和中奖次数趋势")}><polyline points={coordinates("registrations")} className="line-register"/><polyline points={coordinates("draws")} className="line-draw"/><polyline points={coordinates("wins")} className="line-win"/></svg><div className="trend-labels"><span>{series[0].bucket}</span><span>{series[series.length - 1].bucket}</span></div></div>;
}
export default function Activity() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState(choices[0].query);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const response = await fetch(`/api/campaign/stats?${choice}`, { cache: "no-store", signal }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "统计数据获取失败"); setStats(result); setError(""); }
    catch (err) { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "统计数据获取失败"); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [choice]);
  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => { if (document.visibilityState === "visible") void load(controller.signal); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(controller.signal); }, 10000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);
  const percentage = (n?: number) => n == null ? "—" : `${(n * 100).toFixed(1)}%`;
  return <section id="campaign" className="activity-section">
    <div className="section-title campaign-title"><div><span className="section-number">03</span><h2>{t('活动表现')}</h2><span className="section-sub">CAMPAIGN PERFORMANCE</span></div><span className="period">{loading ? t("正在获取数据") : stats && !error ? `${lang === "en" ? "Updated" : "更新于"} ${dateTime(stats.generatedAt)}` : t("连接异常")}</span></div>
    <div className="scope-note">{t("活动累计数据由服务器提供，包含全部历史记录")}{stats?.campaignStartedAt ? `${lang === "en" ? " (First record: " : "（最早记录："}${dateTime(stats.campaignStartedAt)}${lang === "en" ? ")" : "）"}` : ""} {t("与上方 Shopify 的 11 月 12 日 15:00 起统计口径不同。") }</div>
    {error && <div className="activity-error" role="alert">{t(error)}{stats ? t("；以下显示上次成功获取的数据。") : t("，请检查活动服务器配置。")}</div>}
    <div className="activity-kpis">{kpis.map(({ key, label }) => <Card className="activity-kpi" key={key}><span>{key === "cappedUsers" && stats?.limit ? (lang === "en" ? `Users at ${stats.limit}-play limit` : `用满 ${stats.limit} 次人数`) : t(label)}</span><strong>{stats?.totals[key]?.toLocaleString() ?? "—"}</strong><small>{key === "cappedUsers" ? t("累计") : `${t("今日")} ${stats?.today[key]?.toLocaleString() ?? "—"}`}</small></Card>)}</div>
    <div className="activity-grid"><Card className="activity-chart-card"><div className="card-heading"><div><div className="card-kicker">CAMPAIGN TREND</div><h3>{t('活动趋势')}</h3><p>{t('关注注册、抽奖与中奖的变化')}</p></div><span className="print-period">{t(choices.find(item => item.query === choice)?.label || "")}</span><select aria-label={t("活动趋势周期")} className="period-select" value={choice} onChange={e => setChoice(e.target.value)}>{choices.map(item => <option key={item.query} value={item.query}>{t(item.label)}</option>)}</select></div><div className="legend"><span className="reg">{t('注册量')}</span><span className="draw">{t('抽奖次数')}</span><span className="win">{t('中奖次数')}</span></div>{stats ? <Trend series={stats.series}/> : <div className="activity-empty">{loading ? t("正在加载活动趋势…") : t("暂无活动趋势")}</div>}</Card>
    <Card className="activity-rate-card"><div className="card-kicker">CAMPAIGN HEALTH</div><h3>{t('参与与中奖')}</h3><p>{t('累计活动表现')}</p><div className="rate-row"><div><span>{t('参与率')}</span><strong>{percentage(stats?.rates.playRate)}</strong><small>{t('参与人数 / 注册人数')}</small></div><div className="rate-track"><i style={{ width: `${Math.min(100, (stats?.rates.playRate ?? 0) * 100)}%` }}/></div></div><div className="rate-row"><div><span>{t('中奖率')}</span><strong>{percentage(stats?.rates.winRate)}</strong><small>{t('中奖次数 / 抽奖次数')}</small></div><div className="rate-track mint"><i style={{ width: `${Math.min(100, (stats?.rates.winRate ?? 0) * 100)}%` }}/></div></div></Card></div>
    <div className="activity-grid activity-bottom"><Card className="prizes-card"><div className="card-kicker">REWARDS BREAKDOWN</div><h3>{t('奖品统计')}</h3><p>{t('各奖档累计与今日发放情况')}</p><div className="prize-list">{["S", "A", "B", "C"].map(tier => { const prize = stats?.prizes[tier], rule = stats?.prizeRules[tier]; return <div className="prize-row" key={tier}><span className={`prize-badge tier-${tier}`}>{tier}</span><div><b>{rule ? lang === "en" ? `$${rule.discountAmount} off $${rule.minimumSpend}` : `满 $${rule.minimumSpend} 减 $${rule.discountAmount}` : lang === "en" ? `Tier ${tier} reward` : `${tier} 档奖励`}</b><small>{rule?.discountCode || t("等待奖品规则")}</small></div><div className="prize-count"><b>{prize?.total ?? "—"}</b><small>{t("今日")} {prize?.today ?? "—"}</small></div></div>; })}</div></Card>
    <Card className="recent-card"><div className="card-kicker">RECENT ACTIVITY</div><h3>{t('最近动态')}</h3><p>{t('最近 20 条注册和抽奖记录 · 北京时间')}</p><div className="recent-list">{stats?.recent.length ? stats.recent.map((item, i) => <div className="recent-row" key={`${item.at}-${i}`}><span className={`recent-dot ${item.type === "register" ? "register" : "draw-dot"}`}/><div><b>{item.type === "register" ? t("新用户注册") : item.prize ? lang === "en" ? `Won tier ${item.prize}` : `抽中 ${item.prize} 档奖励` : t("参与抽奖")}</b><small>{item.email}</small></div><time>{dateTime(item.at)}</time></div>) : <div className="activity-empty">{loading ? t("正在加载…") : t("暂无动态")}</div>}</div></Card></div>
  </section>;
}
