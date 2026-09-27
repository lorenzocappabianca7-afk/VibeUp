import { roundCurrency } from "@/lib/booking-money";

/** Gross amount. `vatRate` is a fraction, for example 0.22. Net amounts stay unchanged when the rate is missing. */
export function applyVat(net: number, vatRate?: number): number {
  const base = Number.isFinite(net) ? net : 0;
  const rate = vatRate != null && Number.isFinite(vatRate) && vatRate > 0 ? vatRate : 0;
  return roundCurrency(base * (1 + rate));
}
