import { calculateLocationDeposit } from "@/lib/booking-money";
import { calculateBookingQuote, calculateHours, getLocationById } from "@/lib/location";
import type { ManagedListing } from "@/types/admin";
import type { BookingQuote, Location } from "@/types/location";

/** Same window the explore preview uses. Drinks and add-ons stay at zero. */
export const DEMO_EVENT_START_TIME = "18:00";
export const DEMO_EVENT_END_TIME = "23:00";

/** A date far enough ahead that prunePastEvents will not hide the demo event. */
export function demoFallbackEventDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveDemoCatalogLocation(
  id: string,
  listings: ManagedListing[],
): Location | undefined {
  for (const listing of listings) {
    if (listing.category === "locali" && listing.location.id === id) {
      return listing.location;
    }
  }
  return getLocationById(id);
}

/** Location price only: no drinks, no extra services. */
export function quoteForDemoLocation(
  location: Location | undefined,
  date: string,
  guestCount: number,
): BookingQuote {
  if (!location) {
    const locationCost = 800;
    return {
      hours: calculateHours(DEMO_EVENT_START_TIME, DEMO_EVENT_END_TIME),
      locationCost,
      extrasCost: 0,
      drinksCost: 0,
      total: locationCost,
      depositAmount: calculateLocationDeposit(locationCost),
    };
  }

  const quote = calculateBookingQuote({
    hourlyPrice: location.hourlyPrice,
    startTime: DEMO_EVENT_START_TIME,
    endTime: DEMO_EVENT_END_TIME,
    selectedExtras: [],
    guestCount,
    location,
    date,
  });
  if (quote.total > 0) {
    return { ...quote, extrasCost: 0, drinksCost: 0, total: quote.locationCost, depositAmount: calculateLocationDeposit(quote.locationCost) };
  }

  const locationCost = Math.max(location.hourlyPrice * quote.hours, 800);
  return {
    ...quote,
    hours: quote.hours || calculateHours(DEMO_EVENT_START_TIME, DEMO_EVENT_END_TIME),
    locationCost,
    extrasCost: 0,
    drinksCost: 0,
    total: locationCost,
    depositAmount: calculateLocationDeposit(locationCost),
  };
}
