import { getLocationById } from "@/lib/location";
import {
  getServiceProviderById,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import {
  catalogRowToLocation,
  catalogRowToService,
  getPublishedCatalogListingById,
} from "@/server/repositories/catalog";
import type { Location } from "@/types/location";

export async function resolvePublicLocation(
  id: string,
): Promise<Location | null> {
  const mock = getLocationById(id);
  if (mock) return mock;

  const row = await getPublishedCatalogListingById(id);
  return row ? catalogRowToLocation(row) : null;
}

export async function resolvePublicService(
  id: string,
): Promise<ServiceProvider | null> {
  const mock = getServiceProviderById(id);
  if (mock) return mock;

  const row = await getPublishedCatalogListingById(id);
  return row ? catalogRowToService(row) : null;
}
