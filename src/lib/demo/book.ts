import { getLocationById } from "@/lib/location";
import type { ManagedListing } from "@/types/admin";
import type { Location } from "@/types/location";

/** A date far enough ahead that prunePastEvents will not hide the demo event. */
export function demoFallbackEventDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveDemoCatalogLocation(
  id: string,
  listings: ManagedListing[],
): Location | undefined {
  for (const listing of listings) {
    if (listing.category === "locali" && listing.location.id === id) {
      return listing.location;
    }
  }
  return getLocationById(id);
}
