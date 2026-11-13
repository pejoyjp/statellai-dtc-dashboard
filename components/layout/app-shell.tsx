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
    <aside className="sidebar"><div className="brand">
        <svg aria-hidden="true" color="#dd1717" focusable="false" width="1000" height="111" viewBox="0 0 1000 111" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path pathLength="1" d="M388.876 27.1288H347.238V110.859H320.789V27.1288H283.911C273.558 27.1288 265.246 18.7407 265.246 8.46338V0.67981H407.617V8.46338C407.617 18.8163 399.229 27.1288 388.952 27.1288H388.876Z" fill="currentColor"></path>
      <path pathLength="1" d="M451.75 26.6003V42.243H536.311V50.0266C536.311 60.3795 527.923 68.692 517.646 68.692H451.75V84.3347H543.415V92.1183C543.415 102.471 535.026 110.784 524.749 110.784H425.301V18.8167C425.301 8.4638 433.689 0.151245 443.966 0.151245H543.415V7.93482C543.415 18.2877 535.026 26.6003 524.749 26.6003H451.75Z" fill="currentColor"></path>
      <path pathLength="1" d="M675.357 84.3342V92.1178C675.357 102.471 666.969 110.783 656.691 110.783H572.054V0.604126H598.503V84.3342H675.357Z" fill="currentColor"></path>
      <path pathLength="1" d="M803.975 84.3342V92.1178C803.975 102.471 795.587 110.783 785.309 110.783H700.672V0.604126H727.122V84.3342H803.975Z" fill="currentColor"></path>
      <path pathLength="1" d="M973.551 110.783V0.67981H1000V110.859H973.551V110.783Z" fill="currentColor"></path>
      <path pathLength="1" d="M121.968 6.57448V0H18.741C8.38812 0 0 8.38812 0 18.6655V67.4073H96.6523V84.3346H0V90.9091C0 101.262 8.38812 109.575 18.6655 109.575H103.227C113.58 109.575 121.892 101.186 121.892 90.9091V42.1673H25.3911V25.2399H103.302C113.655 25.2399 121.968 16.8518 121.968 6.57448Z" fill="currentColor"></path>
      <path pathLength="1" d="M205.244 30.9832L239.024 100.28C242.122 106.703 248.696 110.784 255.8 110.784H275.448L216.806 0H193.682L135.041 110.784H154.765C161.944 110.784 168.442 106.703 171.616 100.28L205.244 30.9832Z" fill="currentColor"></path>
      <path pathLength="1" d="M886.949 30.9832L920.728 100.28C923.827 106.703 930.401 110.784 937.505 110.784H957.153L898.511 0H875.387L816.746 110.784H836.469C843.648 110.784 850.147 106.703 853.321 100.28L886.949 30.9832Z" fill="currentColor"></path>
      </svg>
      <div>
    
        </div></div>
      <div className="side-label">WORKSPACE</div>{links.map(item => <Link key={item.href} href={item.href} className={`nav-item${active.href === item.href ? " active" : ""}`} aria-current={active.href === item.href ? "page" : undefined}><Icon name={item.icon}/>{t(item.label)}</Link>)}
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumb">{t("工作台")} <Icon name="arrow" size={14}/><b>{t(active.label)}</b></div><div className="top-right"><Button variant="outline" size="sm" className="print-control" onClick={() => window.print()}><span aria-hidden="true">⎙</span> {lang === "zh" ? "打印" : "Print"}</Button><div className="language-tabs print-control" role="group" aria-label={lang === "zh" ? "切换语言" : "Change language"}><button type="button" className={lang === "zh" ? "selected" : ""} aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>中文</button><button type="button" className={lang === "en" ? "selected" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button></div><span className="top-date">2026 BLACK FRIDAY</span><span className="top-divider"/><span className="online-dot"/> {t("运营中")}</div></header>
      <nav className="mobile-nav" aria-label={lang === "zh" ? "主导航" : "Main navigation"}>{links.map(item => <Link key={item.href} href={item.href} className={active.href === item.href ? "active" : ""} aria-current={active.href === item.href ? "page" : undefined}>{t(item.label)}</Link>)}</nav>
      <div className="content"><div className="heading"><div><h1>{pathname === "/" ? t("黑五活动总览") : t(active.label)}</h1></div></div>{children}<footer><span>© 2026 SATELLAI · BLACK FRIDAY DASHBOARD</span><span>MADE FOR BETTER DECISIONS <b>✳</b></span></footer></div>
    </main>
  </div>;
}
