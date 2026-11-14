import type { LandingCompareMark, LandingCompareVenue } from "@/lib/landing/compare-table";
import { PARTNER_LOCATIONS } from "@/lib/catalog/partner-locations";
import { estimateLocationFilteredCost } from "@/lib/location-preview-price";
import { EXPLORE_GUEST_MIN, type Location } from "@/types/location";
import { unstable_cache } from "next/cache";

/** Wednesday and Friday in the launch year, so the band is weekday versus weekend. */
const WEEKDAY = "2027-01-06";
const WEEKEND = "2027-01-08";

const VENUE_IDS = ["loc-villa-sassi", "loc-palazzo-ceriana", "loc-spazio-nuvola-9"] as const;

function groupEuros(amount: number) {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Same low–high span the venue cards use, expressed per guest. */
function perHeadSpan(location: Location): string {
  const weekday = estimateLocationFilteredCost(location, null, WEEKDAY);
  const weekend = estimateLocationFilteredCost(location, null, WEEKEND);
  if (!Number.isFinite(weekday) || !Number.isFinite(weekend) || weekday <= 0 || weekend <= 0) {
    return "—";
  }
  const guests = EXPLORE_GUEST_MIN;
  const low = Math.min(weekday, weekend) / guests;
  const high = Math.max(weekday, weekend) / guests;
  const lowLabel = groupEuros(low);
  const highLabel = groupEuros(high);
  return lowLabel === highLabel ? `${lowLabel} €` : `${lowLabel}–${highLabel} €`;
}

function detailBlob(location: Location) {
  return [
    ...(location.characteristics ?? []),
    ...(location.includedServices ?? []),
    location.technicalDetails?.outdoorArea ? "area esterna" : "",
  ]
    .join("\n")
    .toLowerCase();
}

function flag(location: Location, matches: boolean): LandingCompareMark {
  const known =
    Array.isArray(location.characteristics) ||
    Array.isArray(location.includedServices) ||
    location.technicalDetails != null;
  if (!known) return "missing";
  return matches ? "yes" : "no";
}

function outdoorMark(location: Location): LandingCompareMark {
  const blob = detailBlob(location);
  return flag(location, /giardino|esterno|parco|aperto|area esterna/.test(blob));
}

function parkingMark(location: Location): LandingCompareMark {
  const spots = location.technicalDetails?.parkingSpots ?? 0;
  return flag(location, spots > 0 || /parcheggio/.test(detailBlob(location)));
}

function buildLandingCompareTable(): LandingCompareVenue[] {
  const byId = new Map(PARTNER_LOCATIONS.map((location) => [location.id, location]));
  const venues: LandingCompareVenue[] = [];
  for (const id of VENUE_IDS) {
    const location = byId.get(id);
    if (!location?.name) continue;
    venues.push({
      name: location.name,
      price: perHeadSpan(location),
      capacity: location.capacity > 0 ? String(location.capacity) : "—",
      outdoor: outdoorMark(location),
      parking: parkingMark(location),
    });
  }
  return venues;
}

export const loadLandingCompareTable = unstable_cache(
  async () => buildLandingCompareTable(),
  ["landing-compare-venues"],
  { revalidate: 3600 },
);
