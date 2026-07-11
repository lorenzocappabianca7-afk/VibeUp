import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import type { Location } from "@/types/location";
import type {
  LocationExtractionMetadata,
  SmartLocationRecord,
} from "@/server/services/smart-location-types";

type LocationStoreGlobal = typeof globalThis & {
  __vibeUpSmartLocationStore?: Map<string, SmartLocationRecord>;
};

const globalForLocations = globalThis as LocationStoreGlobal;

function createSeedRecord(location: Location): SmartLocationRecord {
  return {
    location,
    extraction: {
      confidence: 1,
      extractedFields: [],
      priceList: [],
      sourceKinds: [],
      suggestedReviewFields: [],
      rawSummary: "Seed mock location",
      createdAt: new Date().toISOString(),
    },
  };
}

function getStore(): Map<string, SmartLocationRecord> {
  if (!globalForLocations.__vibeUpSmartLocationStore) {
    globalForLocations.__vibeUpSmartLocationStore = new Map(
      MOCK_LOCATIONS.map((location) => [location.id, createSeedRecord(location)]),
    );
  }

  return globalForLocations.__vibeUpSmartLocationStore;
}

export async function saveSmartLocation(params: {
  location: Location;
  extraction: LocationExtractionMetadata;
}): Promise<SmartLocationRecord> {
  const store = getStore();
  const record: SmartLocationRecord = {
    location: params.location,
    extraction: params.extraction,
  };

  store.set(params.location.id, record);
  return record;
}

export async function getSmartLocationById(
  id: string,
): Promise<SmartLocationRecord | null> {
  return getStore().get(id) ?? null;
}

export async function listSmartLocations(): Promise<SmartLocationRecord[]> {
  return Array.from(getStore().values());
}
