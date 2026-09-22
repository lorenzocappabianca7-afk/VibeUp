import { PARTNER_LOCATIONS } from "@/lib/catalog/partner-locations";
import {
  HOURLY_PRICE_OPTIONS,
  CAPACITY_OPTIONS,
  TORINO_DISTRICTS,
  DINTORNI_ZONES,
  EXTRA_SERVICES,
  PIEMONTE_CITY_SUGGESTIONS,
} from "@/lib/mock/mockData";

export {
  HOURLY_PRICE_OPTIONS,
  CAPACITY_OPTIONS,
  TORINO_DISTRICTS,
  DINTORNI_ZONES,
  EXTRA_SERVICES,
  PIEMONTE_CITY_SUGGESTIONS,
};

/** Real venues only. New locations are added in partner-locations.ts. */
export const MOCK_LOCATIONS = PARTNER_LOCATIONS;
