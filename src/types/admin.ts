import type { ExploreCategory, Location, MusicType, PartyType } from "@/types/location";

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
  updatedAt: string;
}

export interface ManagedLocationListing {
  id: string;
  category: "locali";
  location: Location;
  menu: string;
  published: boolean;
  updatedAt: string;
}

export type ManagedListing = ManagedLocationListing | ManagedServiceListing;
