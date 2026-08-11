/** Shared money rules for deposits and platform fee (bank transfer later). */

export const LOCATION_DEPOSIT_RATE = 0.3;
export const DEPOSIT_APP_FEE_RATE = 0.05;

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateLocationDeposit(locationCost: number): number {
  const base = Number.isFinite(locationCost) ? Math.max(0, locationCost) : 0;
  return roundCurrency(base * LOCATION_DEPOSIT_RATE);
}

export function getDepositCheckoutAmounts(depositAmount: number) {
  const base = Number.isFinite(depositAmount) ? Math.max(0, depositAmount) : 0;
  const fee = roundCurrency(base * DEPOSIT_APP_FEE_RATE);
  return {
    base: roundCurrency(base),
    fee,
    total: roundCurrency(base + fee),
  };
}
