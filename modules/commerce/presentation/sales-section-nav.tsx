import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language";

const sections = [
  ["sales-summary", "销售概览"], ["sales-sku", "商品销售"],
  ["sales-discounts", "折扣码分析"], ["sales-traffic", "渠道与流量"],
] as const;

export function SalesSectionNav() {
  const { t } = useLanguage();
  const anchor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string>(sections[0][0]);

  useEffect(() => {
    const report = anchor.current?.closest(".report-sales");
    const filter = report?.querySelector(".sales-global-filter");
    let last = Math.max(0, window.scrollY);
    function update() {
      const position = Math.max(0, window.scrollY);
      if (position === last) return;
      const boundary = filter?.getBoundingClientRect().bottom ?? 0;
      const reportEnd = report?.getBoundingClientRect().bottom ?? 0;
      setVisible(position < last && boundary <= 16 && reportEnd > 64);
      last = position;
      const current = [...sections].reverse().find(([id]) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 90);
      setActive(current?.[0] ?? sections[0][0]);
    }
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <div className="sales-section-nav-anchor print-control" ref={anchor}>
    <div className="sales-section-nav-position">
      <nav className="sales-section-nav" data-visible={visible} aria-label={t("报表导航")}>
        {sections.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={id === active ? "location" : undefined}>
          {t(label)}
        </a>)}
      </nav>
    </div>
  </div>;
}
