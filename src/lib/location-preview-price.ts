import { calculateDrinksCost, DEFAULT_DRINKS_PER_INVITEE } from "@/lib/drinks-quote";
import { calculateBookingQuote } from "@/lib/location";
import { formatCurrency } from "@/lib/utils";
import { EXPLORE_GUEST_MIN, type Location } from "@/types/location";
import type { PartyCriteria } from "@/types/party-criteria";

/** Same default window as the location quote sheet. */
export const PREVIEW_QUOTE_START_TIME = "18:00";
export const PREVIEW_QUOTE_END_TIME = "23:00";

export type PreviewPriceLocation = Pick<
  Location,
  | "hourlyPrice"
  | "priceModel"
  | "eventPrice"
  | "personPrice"
  | "capacity"
  | "drinksPricing"
>;

export type PreviewPriceCriteria = Pick<
  PartyCriteria,
  "guestCount" | "dates" | "dateFrom" | "drinkMode" | "drinksPerInvitee"
>;

export function resolvePreviewGuestCount(
  criteria?: PreviewPriceCriteria | null,
) {
  const guests = criteria?.guestCount;
  if (typeof guests === "number" && Number.isFinite(guests) && guests >= 1) {
    return Math.round(guests);
  }
  return EXPLORE_GUEST_MIN;
}

function previewDates(criteria?: PreviewPriceCriteria | null): Array<string | undefined> {
  if (criteria?.dates?.length) return criteria.dates;
  if (criteria?.dateFrom) return [criteria.dateFrom];
  return [undefined];
}

export function estimateLocationFilteredCost(
  location: PreviewPriceLocation,
  criteria?: PreviewPriceCriteria | null,
  date?: string,
): number {
  const guestCount = resolvePreviewGuestCount(criteria);
  const quote = calculateBookingQuote({
    hourlyPrice: location.hourlyPrice,
    startTime: PREVIEW_QUOTE_START_TIME,
    endTime: PREVIEW_QUOTE_END_TIME,
    selectedExtras: [],
    guestCount,
    location,
    date,
  });
  const drinksCost = calculateDrinksCost({
    mode: criteria?.drinkMode ?? "none",
    drinksPerInvitee: criteria?.drinksPerInvitee ?? DEFAULT_DRINKS_PER_INVITEE,
    guestCount,
    drinkUnitPrice: location.drinksPricing?.drinkUnitPrice,
    openBarPerInvitee: location.drinksPricing?.openBarPerInvitee,
  });
  return quote.locationCost + drinksCost;
}

export function estimateLocationFilteredCostRange(
  location: PreviewPriceLocation,
  criteria?: PreviewPriceCriteria | null,
): { min: number; max: number } {
  const totals = previewDates(criteria).map((date) =>
    estimateLocationFilteredCost(location, criteria, date),
  );
  return {
    min: Math.min(...totals),
    max: Math.max(...totals),
  };
}

export function getFilteredLocationPricePresentation(
  location: PreviewPriceLocation,
  criteria?: PreviewPriceCriteria | null,
): {
  price: string;
  detail: string;
} {
  const { min, max } = estimateLocationFilteredCostRange(location, criteria);
  const hasDateRange = min !== max;
  const guestCount = resolvePreviewGuestCount(criteria);
  const parts = [`${guestCount} ospiti`];

  if (criteria?.drinkMode === "open_bar") {
    parts.push("open bar");
  } else if (criteria?.drinkMode === "per_invitee") {
    parts.push(`${Math.max(1, Math.round(criteria.drinksPerInvitee))} drink`);
  }

  if (hasDateRange) {
    parts.push("secondo la data");
  }

  return {
    price:
      hasDateRange
        ? `${formatCurrency(min)}–${formatCurrency(max)}`
        : formatCurrency(min),
    detail: parts.join(" · "),
  };
}
