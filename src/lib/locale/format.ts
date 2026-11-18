import type { DemoLanguage } from "@/lib/demo/language";
import { translate } from "@/lib/locale/translate";

export function intlLocale(locale: DemoLanguage) {
  return locale === "en" ? "en-GB" : "it-IT";
}

export function formatLongDate(locale: DemoLanguage, value: string | Date) {
  const date =
    typeof value === "string"
      ? new Date(value.length <= 10 ? `${value}T12:00:00` : value)
      : value;
  if (Number.isNaN(date.getTime())) return translate(locale, "Data non disponibile");
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatEuro(locale: DemoLanguage, amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(rounded);
}
