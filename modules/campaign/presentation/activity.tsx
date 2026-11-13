"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language";
import { FieldHelp } from "@/components/ui/field-help";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useReport } from "@/modules/shared/presentation/reporting-period";
import { internalEmailDomains } from "@/modules/shared/domain/internal-emails";
import { TrendChart } from "@/modules/shared/presentation/report-charts";
import type { getActivityEmailList } from "../application/get-activity-email-list";
import type { withActivityEmailReview } from "../domain/activity-stats";

const periods = [
  { label: "最近 7 天", query: "granularity=day&days=7" },
  { label: "最近 30 天", query: "granularity=day&days=30" },
  { label: "最近 24 小时", query: "granularity=hour&hours=24" },
  { label: "最近 7 天（小时）", query: "granularity=hour&hours=168" },
];

const metrics = [
  ["registrations", "累计注册", "活动服务器记录的注册人数。累计覆盖全部历史，今日按北京时间。"],
  ["players", "参与人数", "至少抽奖一次的用户数，同一用户在对应周期内计一次。"],
  ["draws", "累计抽奖", "活动服务器记录的抽奖总次数，重复参与按实际抽奖次数计。"],
  ["wins", "中奖次数", "产生奖品的抽奖次数。同一用户的多次中奖分别计数。"],
  ["misses", "未中奖次数", "未产生奖品的抽奖次数。同一用户的多次未中奖分别计数。"],
  ["cappedUsers", "次数用满人数", "累计达到活动服务器设定抽奖次数上限的用户数。"],
] as const;

export default function Activity() {
  const { t, lang } = useLanguage();
  const [period, setPeriod] = useState(periods[0].query);
  const [revision, setRevision] = useState(0);
  const { data, message, loading } = useReport<ReturnType<typeof withActivityEmailReview>>(
    "/api/campaign/stats?view=activity&" + period, revision,
  );
  useEffect(() => {
    if (loading) return;
    const refresh = () => {
      if (document.visibilityState === "visible") setRevision(value => value + 1);
    };
    const timer = window.setTimeout(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loading, revision]);

  const { data: emailList, loading: loadingEmails } = useReport<Awaited<ReturnType<typeof getActivityEmailList>>>(
    "/api/campaign/stats?view=emails", 0,
  );
  const emails = [...new Set([...(data?.internalEmails ?? []), ...(emailList?.internalEmails ?? [])])].sort();
  const suspectedEmails = [...new Set([...(data?.suspectedEmails ?? []), ...(emailList?.suspectedEmails ?? [])])]
    .filter(email => !emails.includes(email)).sort();
  const emailEmpty = loadingEmails ? "正在获取数据" : emailList?.complete ? "当前周期暂无匹配地址。" : "内部邮箱名单暂不可用。";
  const series = data?.series ?? [];
  const recent = data?.recent;
  const rates = data?.rates;
  const trendMetrics = [["registrations", "注册量"], ["draws", "抽奖次数"], ["wins", "中奖次数"]] as const;
  const formatter = new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", { style: "percent", maximumFractionDigits: 1 });
  const dateTime = (value: string) => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "short",
  }).format(new Date(value));
  const today = (value?: number) => `${t("今日")} ${value?.toLocaleString() ?? "—"}`;

  return <section id="campaign" className="activity-section">
    <div className="section-title"><h2>{t("活动表现")}</h2></div>
    <p className="report-period">{t("活动累计数据由服务器提供，包含全部历史记录")} · {t("北京时间")}</p>
    <p className="report-period">{t("活动服务器汇总包含内部记录。最近动态已按邮箱规则过滤。")}</p>
    {message && <p className="activity-error" role="alert">{t(message)}</p>}
    {loading && !data && <p role="status">{t("正在获取数据")}</p>}
    <div className="activity-kpis">
      {metrics.map(([key, label, help]) => <Card className="activity-kpi" key={key}>
        <span>{key === "cappedUsers" && data?.limit
          ? lang === "en" ? `Users at ${data.limit}-play limit` : `用满 ${data.limit} 次人数`
          : t(label)} <FieldHelp label={`${t(label)} · ${t("指标说明")}`} description={t(help)}/></span><strong>{data?.totals?.[key]?.toLocaleString() ?? "—"}</strong>
        {key !== "cappedUsers" && <small>{today(data?.today?.[key])}</small>}
      </Card>)}
    </div>
    <div className="report-pair">
      <TrendChart title={t("活动趋势")} leftUnit={t("次数")} action={<>
        <span className="print-period">{t(periods.find(item => item.query === period)!.label)}</span>
        <select aria-label={t("活动趋势周期")} className="period-select" value={period} onChange={event => setPeriod(event.target.value)}>
          {periods.map(item => <option key={item.query} value={item.query}>{t(item.label)}</option>)}
        </select>
      </>} series={trendMetrics.map(([key, label]) => ({
        label: t(label), points: series.map(row => ({
          time: row.bucket, value: row[key],
        })) }))}/>
      <Card className="report-card report-chart-card">
        <CardHeader className="report-card-header"><h3>{t("参与与中奖")}</h3></CardHeader>
        <CardContent className="report-card-body">
          <dl className="campaign-detail-list">
            <div>
              <dt>{t("参与率")} <FieldHelp label={t("参与率说明")}
                description={t("累计参与人数 ÷ 累计注册人数 × 100%。参与人数按至少抽奖一次的用户去重。")}/></dt>
              <dd>{typeof rates?.playRate === "number" ? formatter.format(rates.playRate) : "—"}</dd>
            </div>
            <div>
              <dt>{t("中奖率")} <FieldHelp label={t("中奖率说明")}
                description={t("累计中奖次数 ÷ 累计抽奖次数 × 100%。同一用户多次抽奖时，每次都计入抽奖次数，中奖的场次也分别计入中奖次数。")}/></dt>
              <dd>{typeof rates?.winRate === "number" ? formatter.format(rates.winRate) : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
    <div className="report-pair">
      <Card className="report-card">
        <CardHeader className="report-card-header"><h3>{t("奖品统计")}</h3></CardHeader>
        <CardContent className="report-card-body">
          <dl className="campaign-detail-list">{["S", "A", "B", "C"].map(tier => {
            const rule = data?.prizeRules?.[tier];
            return <div key={tier}><dt><b>{tier}</b>{rule && <>
              <small>{lang === "en" ? `$${rule.discountAmount} off $${rule.minimumSpend}` : `满 $${rule.minimumSpend} 减 $${rule.discountAmount}`}</small>
              <small>{rule.discountCode}</small>
            </>}</dt>
              <dd>{data?.prizes?.[tier]?.total?.toLocaleString() ?? "—"} <small>{today(data?.prizes?.[tier]?.today)}</small></dd></div>;
          })}</dl>
        </CardContent>
      </Card>
      <Card className="report-card">
        <CardHeader className="report-card-header"><h3>{t("最近动态")}</h3></CardHeader>
        <CardContent className="report-card-body">
          {recent?.length ? <ul className="campaign-recent">{recent.map((event, index) => <li key={index}>
            <div><strong>{t(event.type === "register" ? "新用户注册" : "参与抽奖")}{event.prize ? ` · ${event.prize}` : ""}</strong><small>{event.email}</small></div>
            <time dateTime={event.at}>{dateTime(event.at)}</time>
          </li>)}</ul> : <p className="report-empty">{t(recent ? "暂无动态" : "数据暂不可用")}</p>}
        </CardContent>
      </Card>
    </div>
    <div className="report-pair">
      <div className="scope-note">
        <strong>{t("已排除的内部邮箱")}</strong>
        <p>{t("排除域名")} · {internalEmailDomains.join(", ")}</p>
        <p>{t("完整地址来自 Shopify 黑五报表、最近活动记录和已配置名单。")}</p>
        {emails.length ? <ul className="report-emails">{emails.map(email => <li key={email}>{email}</li>)}</ul>
          : <p>{t(emailEmpty)}</p>}
        {emailList && !emailList.complete && <p>{t("Shopify 邮箱名单可能不完整。")}</p>}
      </div>
      <div className="scope-note">
        <strong>{t("疑似内部邮箱")}</strong>
        <p>{t("根据邮箱用户名中的拼音筛选，待人工确认。")}</p>
        {suspectedEmails.length ? <ul className="report-emails">
          {suspectedEmails.map(email => <li key={email}>{email}</li>)}
        </ul> : <p>{t(emailEmpty)}</p>}
      </div>
    </div>
  </section>;
}
