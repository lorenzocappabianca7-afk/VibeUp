/** Drink package options for location instant quotes. */

export type DrinkPackageMode = "none" | "per_invitee" | "open_bar";

export const DRINK_UNIT_PRICE = 6;
export const OPEN_BAR_PER_INVITEE = 16;
export const DEFAULT_DRINKS_PER_INVITEE = 3;
export const MIN_DRINKS_PER_INVITEE = 1;
export const MAX_DRINKS_PER_INVITEE = 12;

export function clampDrinksPerInvitee(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_DRINKS_PER_INVITEE;
  return Math.min(
    MAX_DRINKS_PER_INVITEE,
    Math.max(MIN_DRINKS_PER_INVITEE, Math.round(value)),
  );
}

export function calculateDrinksCost(params: {
  mode: DrinkPackageMode;
  drinksPerInvitee: number;
  guestCount: number;
}): number {
  const { mode, guestCount } = params;
  if (mode === "none" || guestCount <= 0) return 0;

  if (mode === "open_bar") {
    return OPEN_BAR_PER_INVITEE * guestCount;
  }

  return (
    clampDrinksPerInvitee(params.drinksPerInvitee) *
    DRINK_UNIT_PRICE *
    guestCount
  );
}

export function getDrinkPackageLabel(params: {
  mode: DrinkPackageMode;
  drinksPerInvitee: number;
}): string {
  if (params.mode === "open_bar") return "Open bar";
  if (params.mode === "per_invitee") {
    const drinks = clampDrinksPerInvitee(params.drinksPerInvitee);
    return `${drinks} drink/invitato`;
  }
  return "Nessuna bevanda";
}
