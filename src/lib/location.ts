import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import { getLocationListBaseCost } from "@/lib/location-publish-form";
import type {
  BookingQuote,
  ExtraService,
  ExtraServiceId,
  Location,
} from "@/types/location";

export function getLocationById(id: string): Location | undefined {
  return MOCK_LOCATIONS.find((location) => location.id === id);
}

/** Latest allowed party end hour (inclusive), for overnight events. */
export const PARTY_END_LATEST_HOUR = 3;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
  return hours * 60 + minutes;
}

/** End is after start same-day, or overnight ending by 03:00. */
export function isEndTimeAfterStart(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (end > start) return true;
  return end <= PARTY_END_LATEST_HOUR * 60 && start > end;
}

export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  if (!isEndTimeAfterStart(startTime, endTime)) return 0;

  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

/** Suggest a valid end time after changing start (prefers +minHours, overnight ok). */
export function suggestEndTimeAfterStart(
  startTime: string,
  preferredEnd: string,
  candidateTimes: readonly string[],
  minHours = 1,
): string {
  if (
    isEndTimeAfterStart(startTime, preferredEnd) &&
    calculateHours(startTime, preferredEnd) >= minHours
  ) {
    return preferredEnd;
  }

  const valid = candidateTimes.filter(
    (time) =>
      isEndTimeAfterStart(startTime, time) &&
      calculateHours(startTime, time) >= minHours,
  );
  if (valid.length > 0) return valid[0];

  // Fallback: first end after start, even if below minHours
  const anyAfter = candidateTimes.find((time) =>
    isEndTimeAfterStart(startTime, time),
  );
  return anyAfter ?? preferredEnd;
}

export function getExtraServicePrice(
  service: ExtraService,
  options?: { cakeKg?: number; guestCount?: number },
): number {
  const { cakeKg = 3, guestCount = 20 } = options ?? {};

  if (service.pricing.type === "fixed") {
    return service.pricing.price;
  }
  if (service.pricing.type === "per_kg") {
    return service.pricing.pricePerKg * cakeKg;
  }
  return (
    service.pricing.pricePerPerson *
    Math.max(guestCount, service.pricing.minGuests)
  );
}

export function calculateBookingQuote(params: {
  hourlyPrice: number;
  startTime: string;
  endTime: string;
  selectedExtras: ExtraServiceId[];
  cakeKg?: number;
  guestCount?: number;
  /** When set, uses event/person list price instead of hours × hourly. */
  location?: Pick<
    Location,
    "priceModel" | "eventPrice" | "personPrice" | "hourlyPrice" | "capacity"
  >;
}): BookingQuote {
  const {
    hourlyPrice,
    startTime,
    endTime,
    selectedExtras,
    cakeKg = 3,
    guestCount = 20,
    location,
  } = params;

  const hours = calculateHours(startTime, endTime);
  const locationCost = location
    ? getLocationListBaseCost(location, { hours, guestCount })
    : hours * hourlyPrice;

  const extrasCost = selectedExtras.reduce((sum, id) => {
    const service = EXTRA_SERVICES.find((s) => s.id === id);
    if (!service) return sum;
    return (
      sum + getExtraServicePrice(service, { cakeKg, guestCount })
    );
  }, 0);

  const total = locationCost + extrasCost;
  const depositAmount = locationCost * 0.3;

  return {
    hours,
    locationCost,
    extrasCost,
    drinksCost: 0,
    total,
    depositAmount,
  };
}
