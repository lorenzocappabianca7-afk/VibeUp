/** Friday–Sunday venue nights vs weekday rates. */
export const WEEKEND_PRICE_MULTIPLIER = 1.2;

export function isWeekendPartyDate(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  const stamp = Date.parse(`${isoDate}T12:00:00`);
  if (!Number.isFinite(stamp)) return false;
  const day = new Date(stamp).getDay();
  return day === 0 || day === 5 || day === 6;
}

export function getLocationDatePriceMultiplier(
  isoDate: string | null | undefined,
): number {
  return isWeekendPartyDate(isoDate) ? WEEKEND_PRICE_MULTIPLIER : 1;
}

export function applyDatePriceMultiplier(
  amount: number,
  isoDate: string | null | undefined,
): number {
  return Math.round(amount * getLocationDatePriceMultiplier(isoDate));
}

export function datePriceBandLabel(
  isoDate: string,
): "Weekend" | "Feriale" {
  return isWeekendPartyDate(isoDate) ? "Weekend" : "Feriale";
}
