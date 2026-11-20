import { includedPartyServices } from "@/lib/included-party-services";
import type { Location } from "@/types/location";
import {
  PARTY_SERVICE_PICKS,
  type PartyServicePick,
} from "@/types/party-criteria";

/**
 * The catalog never names a photographer. These evenings already bundle the
 * party, so the demo treats a photographer as included there. Paid add-ons
 * (a DJ or catering with its own price) stay out of this list.
 */
const DEMO_INCLUDED: Partial<Record<string, readonly PartyServicePick[]>> = {
  "loc-castello-di-montaldo": ["photographer"],
  "loc-villa-sassi": ["photographer"],
  "loc-palazzo-ceriana": ["photographer"],
};

type PartyLocation = Pick<Location, "id" | "includedServices" | "availableServices">;

export function demoIncludedPartyServiceIds(location: PartyLocation): PartyServicePick[] {
  const extra = new Set(DEMO_INCLUDED[location.id] ?? []);
  return PARTY_SERVICE_PICKS.filter(
    (id) => extra.has(id) || includedPartyServices(location, [id]).includes(id),
  );
}

export function demoVenueIncludesPartyService(
  location: PartyLocation,
  serviceId: PartyServicePick,
) {
  return demoIncludedPartyServiceIds(location).includes(serviceId);
}
