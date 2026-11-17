import { resolveDemoCatalogLocation } from "@/lib/demo/book";
import { CUSTOM_VENUE_ID } from "@/lib/demo/custom-venue";
import { includedPartyServices } from "@/lib/included-party-services";
import type { ManagedListing } from "@/types/admin";
import {
  PARTY_SERVICE_OPTIONS,
  type PartyServicePick,
} from "@/types/party-criteria";

/**
 * Services still missing from the demo party: not included in the chosen
 * venue price, and not already added from the event card.
 * A wizard pick does not hide a service the venue does not include.
 */
export function demoMissingServiceIds(input: {
  locationId: string | null;
  listings?: readonly ManagedListing[];
  addedServiceId?: PartyServicePick | null;
}): PartyServicePick[] {
  const location =
    input.locationId && input.locationId !== CUSTOM_VENUE_ID
      ? resolveDemoCatalogLocation(input.locationId, [...(input.listings ?? [])])
      : undefined;
  const included = new Set(location ? includedPartyServices(location) : []);
  return PARTY_SERVICE_OPTIONS.map((option) => option.id).filter(
    (id) => id !== input.addedServiceId && !included.has(id),
  );
}
