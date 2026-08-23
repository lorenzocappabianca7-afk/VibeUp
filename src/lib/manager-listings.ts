import type {
  ManagedListing,
  ManagedLocationListing,
} from "@/types/admin";

export function isManagedLocationListing(
  listing: ManagedListing,
): listing is ManagedLocationListing {
  return listing.category === "locali";
}

export function listingBelongsToBusiness(
  listing: ManagedLocationListing,
  params: { email?: string | null; businessName?: string | null },
): boolean {
  const email = params.email?.trim().toLowerCase() ?? "";
  const businessName = params.businessName?.trim().toLowerCase() ?? "";

  if (email && listing.submitterEmail?.trim().toLowerCase() === email) {
    return true;
  }

  const venueName = listing.location.name.trim().toLowerCase();
  if (businessName && venueName === businessName) {
    return true;
  }
  if (businessName && venueName.includes(businessName)) {
    return true;
  }

  return false;
}

export function listingsForBusiness(
  listings: readonly ManagedListing[],
  params: { email?: string | null; businessName?: string | null },
): ManagedLocationListing[] {
  return listings.filter(
    (listing): listing is ManagedLocationListing =>
      isManagedLocationListing(listing) &&
      listingBelongsToBusiness(listing, params),
  );
}
