import {
  estimateLocationFilteredCostRange,
  resolvePreviewGuestCount,
} from "@/lib/location-preview-price";
import type { PreviewPriceLocation } from "@/lib/location-preview-price";
import type { PartyCriteria } from "@/types/party-criteria";

/**
 * Upper end of the budget the guest picked.
 * "fino a 1.000" and "1.000–2.000" have a ceiling. "oltre 3.000" does not.
 */
export function partyBudgetCeiling(criteria: Pick<PartyCriteria, "budgetMax">) {
  const max = criteria.budgetMax;
  if (typeof max !== "number" || !Number.isFinite(max)) return null;
  return max;
}

/** Starting price per guest. A weekday/weekend range uses the lower end. */
export function locationStartingPricePerHead(
  location: PreviewPriceLocation,
  criteria: PartyCriteria,
) {
  const { min } = estimateLocationFilteredCostRange(location, criteria);
  const guests = Math.max(1, resolvePreviewGuestCount(criteria));
  return min / guests;
}

/** Same ceiling, split across the guest count the quote already uses. */
export function budgetPerHeadCeiling(criteria: PartyCriteria) {
  const ceiling = partyBudgetCeiling(criteria);
  if (ceiling == null) return null;
  const guests = Math.max(1, resolvePreviewGuestCount(criteria));
  return ceiling / guests;
}

export interface BudgetGroups<T> {
  inBudget: T[];
  overBudget: Array<{ location: T; overagePerHead: number }>;
}

/**
 * Keeps the current order inside the budget.
 * Places the rest after it, closest overage first.
 * Returns null when there is no ceiling to compare against.
 */
export function splitLocationsByBudget<T extends PreviewPriceLocation>(
  locations: readonly T[],
  criteria: PartyCriteria,
): BudgetGroups<T> | null {
  const ceiling = budgetPerHeadCeiling(criteria);
  if (ceiling == null) return null;

  const inBudget: T[] = [];
  const overBudget: Array<{ location: T; overagePerHead: number; index: number }> = [];
  locations.forEach((location, index) => {
    const gap = locationStartingPricePerHead(location, criteria) - ceiling;
    if (gap <= 0.009) {
      inBudget.push(location);
      return;
    }
    overBudget.push({ location, overagePerHead: gap, index });
  });
  overBudget.sort(
    (left, right) => left.overagePerHead - right.overagePerHead || left.index - right.index,
  );
  return {
    inBudget,
    overBudget: overBudget.map(({ location, overagePerHead }) => ({
      location,
      overagePerHead,
    })),
  };
}

/** Whole euros, and at least 1 when the venue is actually over the ceiling. */
export function roundedOverageEuros(overagePerHead: number) {
  const rounded = Math.round(overagePerHead);
  return rounded < 1 ? 1 : rounded;
}
