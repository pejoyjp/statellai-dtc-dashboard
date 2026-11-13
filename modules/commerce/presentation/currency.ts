export function currencyFormatter(locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
}

export function currencySymbol(locale: string, currency: string) {
  return currencyFormatter(locale, currency).formatToParts(0).find(part => part.type === "currency")?.value ?? currency;
}
