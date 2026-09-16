import { isDemoMode } from "@/lib/demo/mode";
import { formatCurrency } from "@/lib/utils";

/**
 * Display band around a *calculated estimate* in demo (explore, location
 * detail, preventivo). Do not use this for Eventi or other amounts confirmed
 * by the venue manager — those stay exact via `formatCurrency`.
 */
export const DEMO_QUOTE_PRICE_MARGIN_EUR = 150;

function safeAmount(amount: number) {
  return Number.isFinite(amount) ? amount : 0;
}

export function formatDemoQuotePriceRange(
  amount: number,
  locale = "it-IT",
): string {
  const center = safeAmount(amount);
  const min = Math.max(0, center - DEMO_QUOTE_PRICE_MARGIN_EUR);
  const max = center + DEMO_QUOTE_PRICE_MARGIN_EUR;
  return `${formatCurrency(min, locale)}–${formatCurrency(max, locale)}`;
}

/** Production: exact amount. Demo: ±€150 around the calculated quote. */
export function formatQuoteDisplayPrice(
  amount: number,
  locale = "it-IT",
): string {
  return isDemoMode()
    ? formatDemoQuotePriceRange(amount, locale)
    : formatCurrency(amount, locale);
}

/**
 * Span of calculated amounts (e.g. weekday vs weekend).
 * Demo widens the outer bounds by ±€150.
 */
export function formatQuoteDisplayPriceSpan(
  min: number,
  max: number,
  locale = "it-IT",
): string {
  const low = safeAmount(Math.min(min, max));
  const high = safeAmount(Math.max(min, max));
  if (!isDemoMode()) {
    return low === high
      ? formatCurrency(low, locale)
      : `${formatCurrency(low, locale)}–${formatCurrency(high, locale)}`;
  }
  return `${formatCurrency(Math.max(0, low - DEMO_QUOTE_PRICE_MARGIN_EUR), locale)}–${formatCurrency(high + DEMO_QUOTE_PRICE_MARGIN_EUR, locale)}`;
}
