"use client";
import { useState } from "react";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/layout/icon";
type Summary = { email: string; drawCount: number; remainingPlays: number; winCount: number; prizeSCount: number; prizeACount: number; prizeBCount: number; prizeCCount: number };
export default function CustomerLookup() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  async function lookup(e: React.FormEvent) { e.preventDefault(); setLooking(true); setSummary(null); setLookupError(""); try { const res = await fetch("/api/campaign/users/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const result = await res.json(); if (!res.ok) setLookupError(result.message); else setSummary(result); } catch { setLookupError("查询失败，请稍后重试"); } finally { setLooking(false); } }
  return <>
      <section id="lookup"><div className="section-title campaign-title"><div><span className="section-number">04</span><h2>{t('用户查询')}</h2><span className="section-sub">USER LOOKUP</span></div></div>
      <div className="bottom-grid lookup-grid">      <Card className="lookup-card"><div className="card-kicker">QUICK LOOKUP</div><h3>{t('查询活动用户')}</h3><p>{t('输入邮箱，查看该用户的游戏和中奖情况。')}</p><form onSubmit={lookup}><label htmlFor="email">{t('用户邮箱')}</label><div className="input-row"><div className="input-wrap"><Icon name="search" size={17}/><input id="email" type="email" required placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)}/></div><Button type="submit" disabled={looking}>{looking ? t("查询中") : t("查询")} <span>→</span></Button></div></form>{lookupError && <div className="lookup-error" role="alert">{t(lookupError)}</div>}{summary ? <div className="summary"><div><span>{t('已玩次数')}</span><b>{summary.drawCount}</b></div><div><span>{t('剩余次数')}</span><b>{summary.remainingPlays}</b></div><div><span>{t('中奖次数')}</span><b>{summary.winCount}</b></div><p>S {summary.prizeSCount} · A {summary.prizeACount} · B {summary.prizeBCount} · C {summary.prizeCCount}</p></div> : <div className="lookup-hint"><span>✳</span><div><b>{t('快速了解用户参与情况')}</b><small>{t('查询不会消耗用户的游戏次数')}</small></div></div>}</Card></div>
  </section></>;
}
