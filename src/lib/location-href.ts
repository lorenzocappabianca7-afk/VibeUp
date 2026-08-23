import { EXPLORE_GUEST_MIN } from "@/types/location";
import {
  normalizePartyDates,
  type PartyCriteria,
} from "@/types/party-criteria";

export function buildLocationHref(
  locationId: string,
  input: {
    guestCount?: number | null;
    dates?: readonly string[];
    dateFrom?: string | null;
    dateTo?: string | null;
  },
): string {
  const params = new URLSearchParams();
  const guestCount = input.guestCount ?? EXPLORE_GUEST_MIN;
  params.set("guestCount", String(Math.max(1, guestCount)));

  const dates = normalizePartyDates(
    input.dates?.length
      ? input.dates
      : [input.dateFrom, input.dateTo].filter(
          (item): item is string =>
            typeof item === "string" && item.length > 0,
        ),
  );
  if (dates.length > 0) params.set("dates", dates.join(","));
  const dateFrom = dates[0] ?? input.dateFrom ?? null;
  const dateTo =
    dates[dates.length - 1] ?? input.dateTo ?? input.dateFrom ?? null;
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  return `/location/${locationId}?${params.toString()}`;
}

export function buildLocationHrefFromCriteria(
  locationId: string,
  criteria: PartyCriteria,
  event?: { guestCount?: number; date?: string },
): string {
  const dates =
    criteria.dates.length > 0
      ? criteria.dates
      : event?.date
        ? [event.date]
        : [];

  return buildLocationHref(locationId, {
    guestCount: criteria.guestCount ?? event?.guestCount ?? EXPLORE_GUEST_MIN,
    dates,
    dateFrom: dates[0] ?? criteria.dateFrom ?? event?.date ?? null,
    dateTo:
      dates[dates.length - 1] ??
      criteria.dateTo ??
      criteria.dateFrom ??
      event?.date ??
      null,
  });
}
