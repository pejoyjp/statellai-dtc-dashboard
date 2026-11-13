"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language";
import { Button } from "@/components/ui/button";
import { Icon } from "./icon";

const links = [
  { href: "/", label: "总览", icon: "grid" },
  { href: "/sales", label: "销售表现", icon: "chart" },
  { href: "/health", label: "网站健康度", icon: "chart" },
  { href: "/campaign", label: "活动数据", icon: "gift" },
  { href: "/customers", label: "用户查询", icon: "users" },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const active = links.find(item => item.href === pathname) || links[0];
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">S<span>✳</span></div><div><b>SATELLAI</b><small>COMMERCE INTELLIGENCE</small></div></div>
      <div className="side-label">WORKSPACE</div>{links.map(item => <Link key={item.href} href={item.href} className={`nav-item${active.href === item.href ? " active" : ""}`} aria-current={active.href === item.href ? "page" : undefined}><Icon name={item.icon}/>{t(item.label)}</Link>)}
      <div className="side-bottom"><div className="side-campaign"><div className="spark">✳</div><div><b>BLACK FRIDAY</b><small>2026 Campaign</small></div><span>↗</span></div><div className="profile"><div className="avatar">S</div><div><b>{t("运营工作台")}</b><small>Satellai Team</small></div><span>⌄</span></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumb">{t("工作台")} <Icon name="arrow" size={14}/><b>{t(active.label)}</b></div><div className="top-right"><Button variant="outline" size="sm" className="print-control" onClick={() => window.print()}><span aria-hidden="true">⎙</span> {lang === "zh" ? "打印" : "Print"}</Button><div className="language-tabs print-control" role="group" aria-label={lang === "zh" ? "切换语言" : "Change language"}><button type="button" className={lang === "zh" ? "selected" : ""} aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>中文</button><button type="button" className={lang === "en" ? "selected" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button></div><span className="top-date">2026 BLACK FRIDAY</span><span className="top-divider"/><span className="online-dot"/> {t("运营中")}</div></header>
      <nav className="mobile-nav" aria-label={lang === "zh" ? "主导航" : "Main navigation"}>{links.map(item => <Link key={item.href} href={item.href} className={active.href === item.href ? "active" : ""} aria-current={active.href === item.href ? "page" : undefined}>{t(item.label)}</Link>)}</nav>
      <div className="content"><div className="heading"><div><h1>{pathname === "/" ? t("黑五活动总览") : t(active.label)}</h1></div></div>{children}<footer><span>© 2026 SATELLAI · BLACK FRIDAY DASHBOARD</span><span>MADE FOR BETTER DECISIONS <b>✳</b></span></footer></div>
    </main>
  </div>;
}
