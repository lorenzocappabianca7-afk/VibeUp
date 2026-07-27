import type { ExploreCategory, Location, MusicType, PartyType } from "@/types/location";

export type ManagedListingStatus = "draft" | "pending_review" | "published";
export type ManagedListingSource = "admin" | "business";

export interface ManagedServiceListing {
  id: string;
  category: Exclude<ExploreCategory, "locali">;
  name: string;
  description: string;
  providerZone: string;
  price: number;
  priceSuffix: string;
  imageUrl?: string;
  galleryImageUrls?: string[];
  musicTypes?: MusicType[];
  partyTypes?: PartyType[];
  published: boolean;
  status?: ManagedListingStatus;
  updatedAt: string;
}

export interface ManagedLocationListing {
  id: string;
  category: "locali";
  location: Location;
  menu: string;
  /** True only when live in Esplora (kept for backward compatibility). */
  published: boolean;
  status?: ManagedListingStatus;
  source?: ManagedListingSource;
  submitterEmail?: string;
  updatedAt: string;
}

export type ManagedListing = ManagedLocationListing | ManagedServiceListing;

export function getManagedListingStatus(
  listing: ManagedListing,
): ManagedListingStatus {
  if (listing.status) return listing.status;
  return listing.published ? "published" : "draft";
}

export function isManagedListingLive(listing: ManagedListing): boolean {
  return getManagedListingStatus(listing) === "published";
}
