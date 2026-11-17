import { includedPartyServices } from "@/lib/included-party-services";
import { CUSTOM_VENUE_ID } from "@/lib/demo/custom-venue";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  PARTY_SERVICE_OPTIONS,
  type PartyServicePick,
} from "@/types/party-criteria";

/**
 * Services still missing from the demo party: not included in the chosen
 * venue price, and not picked in the wizard as already included.
 */
export function demoMissingServiceIds(input: {
  locationId: string | null;
  wizardServices: readonly PartyServicePick[];
  addedServiceId?: PartyServicePick | null;
}): PartyServicePick[] {
  const location =
    input.locationId && input.locationId !== CUSTOM_VENUE_ID
      ? MOCK_LOCATIONS.find((item) => item.id === input.locationId)
      : undefined;
  const included = new Set(location ? includedPartyServices(location) : []);
  const picked = new Set(input.wizardServices);
  return PARTY_SERVICE_OPTIONS.map((option) => option.id).filter(
    (id) => id !== input.addedServiceId && !included.has(id) && !picked.has(id),
  );
}
