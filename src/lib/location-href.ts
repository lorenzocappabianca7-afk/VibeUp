import type { DrinkPackageMode } from "@/lib/drinks-quote";
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

export function buildLocationQuoteShareHref(
  locationId: string,
  input: {
    guestCount?: number | null;
    dates?: readonly string[];
    dateFrom?: string | null;
    dateTo?: string | null;
    startTime?: string;
    endTime?: string;
    drinkMode?: DrinkPackageMode;
    drinksPerInvitee?: number;
    serviceIds?: string[];
    title?: string;
  },
) {
  const href = buildLocationHref(locationId, input);
  const params = new URLSearchParams(href.split("?")[1] ?? "");
  if (input.startTime) params.set("startTime", input.startTime);
  if (input.endTime) params.set("endTime", input.endTime);
  if (input.drinkMode) params.set("drinkMode", input.drinkMode);
  if (input.drinkMode === "per_invitee" && input.drinksPerInvitee) {
    params.set("drinks", String(input.drinksPerInvitee));
  }
  if (input.serviceIds?.length) {
    params.set("services", input.serviceIds.join(","));
  }
  const title = input.title?.trim();
  if (title) params.set("title", title.slice(0, 80));
  return `/location/${locationId}?${params.toString()}#ricapitoliamo`;
}

export function buildServiceQuoteShareHref(
  serviceId: string,
  input: {
    guestCount?: number | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    hours?: number | null;
    eventAddress?: string | null;
    eventId?: string | null;
  },
) {
  const params = new URLSearchParams();
  if (input.guestCount) params.set("guestCount", String(input.guestCount));
  if (input.dateFrom) params.set("dateFrom", input.dateFrom);
  if (input.dateTo) params.set("dateTo", input.dateTo);
  if (input.hours) params.set("hours", String(input.hours));
  if (input.eventAddress?.trim()) {
    params.set("eventAddress", input.eventAddress.trim());
  }
  if (input.eventId) params.set("eventId", input.eventId);
  params.set("quote", "1");
  const query = params.toString();
  return query
    ? `/service/${serviceId}?${query}#preventivo`
    : `/service/${serviceId}#preventivo`;
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
