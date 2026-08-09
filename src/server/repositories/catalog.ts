import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { syncListingMediaRows } from "@/lib/storage/listing-media";
import type { ManagedListingStatus } from "@/types/admin";
import type {
  ExploreCategory,
  GeoArea,
  Location,
  PartyType,
} from "@/types/location";

export type CatalogListingKind = "location" | "service";

export interface CatalogListingRow {
  id: string;
  owner_id: string | null;
  kind: CatalogListingKind;
  category: ExploreCategory;
  status: ManagedListingStatus | "archived";
  name: string;
  description: string;
  city: string | null;
  address: string | null;
  provider_zone: string | null;
  data: Record<string, unknown>;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TECHNICAL = {
  surfaceSqm: 80,
  parkingSpots: 0,
  minHours: 4,
  maxGuests: 50,
  accessibility: false,
  airConditioning: false,
  outdoorArea: false,
};

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asPartyTypes(value: unknown): PartyType[] {
  const allowed: PartyType[] = [
    "compleanno",
    "matrimonio",
    "aziendale",
    "laurea",
    "festa",
  ];
  if (!Array.isArray(value)) return ["festa"];
  const next = value.filter((item): item is PartyType =>
    allowed.includes(item as PartyType),
  );
  return next.length > 0 ? next : ["festa"];
}

function asGeoArea(value: unknown): GeoArea {
  return value === "dintorni" ? "dintorni" : "torino_citta";
}

/** Reconstruct a Location from a catalog row (denormalized columns + jsonb data). */
export function catalogRowToLocation(row: CatalogListingRow): Location | null {
  if (row.kind !== "location" || row.category !== "locali") return null;

  const data = row.data ?? {};
  const technicalRaw =
    data.technicalDetails && typeof data.technicalDetails === "object"
      ? (data.technicalDetails as Record<string, unknown>)
      : {};

  const cover =
    row.cover_image_url ||
    asString(data.imageUrl, "") ||
    asStringArray(data.gallery)[0] ||
    "";

  const gallery = asStringArray(data.gallery);
  if (cover && !gallery.includes(cover)) gallery.unshift(cover);

  const capacity = asNumber(
    data.capacity,
    asNumber(technicalRaw.maxGuests, DEFAULT_TECHNICAL.maxGuests),
  );

  return {
    id: row.id,
    name: row.name,
    city: row.city || asString(data.city, "Torino"),
    comune: asString(data.comune, row.city || "Torino"),
    regione: "Piemonte",
    address: row.address || asString(data.address, ""),
    geoArea: asGeoArea(data.geoArea),
    district: data.district as Location["district"],
    zone: data.zone as Location["zone"],
    zoneLabel: asString(data.zoneLabel, row.city || "Torino"),
    distanceBadge:
      typeof data.distanceBadge === "string" ? data.distanceBadge : undefined,
    latitude: asNumber(data.latitude, 45.0703),
    longitude: asNumber(data.longitude, 7.6869),
    imageUrl: cover,
    gallery,
    description: row.description || asString(data.description, ""),
    technicalDetails: {
      surfaceSqm: asNumber(
        technicalRaw.surfaceSqm,
        DEFAULT_TECHNICAL.surfaceSqm,
      ),
      parkingSpots: asNumber(
        technicalRaw.parkingSpots,
        DEFAULT_TECHNICAL.parkingSpots,
      ),
      minHours: asNumber(technicalRaw.minHours, DEFAULT_TECHNICAL.minHours),
      maxGuests: asNumber(technicalRaw.maxGuests, capacity),
      accessibility: Boolean(
        technicalRaw.accessibility ?? DEFAULT_TECHNICAL.accessibility,
      ),
      airConditioning: Boolean(
        technicalRaw.airConditioning ?? DEFAULT_TECHNICAL.airConditioning,
      ),
      outdoorArea: Boolean(
        technicalRaw.outdoorArea ?? DEFAULT_TECHNICAL.outdoorArea,
      ),
    },
    hourlyPrice: asNumber(data.hourlyPrice, 100),
    priceModel:
      data.priceModel === "event" || data.priceModel === "person"
        ? data.priceModel
        : undefined,
    eventPrice:
      typeof data.eventPrice === "number" ? data.eventPrice : undefined,
    personPrice:
      typeof data.personPrice === "number" ? data.personPrice : undefined,
    priceBadge:
      typeof data.priceBadge === "string" ? data.priceBadge : undefined,
    capacity,
    partyTypes: asPartyTypes(data.partyTypes),
    deposit: asNumber(data.deposit, Math.round(asNumber(data.hourlyPrice, 100) * 2)),
    includedServices: asStringArray(data.includedServices),
    availableServices: Array.isArray(data.availableServices)
      ? (data.availableServices as Location["availableServices"])
      : undefined,
    drinksPricing:
      data.drinksPricing && typeof data.drinksPricing === "object"
        ? (data.drinksPricing as Location["drinksPricing"])
        : undefined,
    contactsBeenHere: {
      count: 0,
      contacts: [],
    },
  };
}

export async function listPublishedCatalogLocations(): Promise<Location[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("kind", "location")
      .eq("category", "locali")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[catalog] listPublishedCatalogLocations", error.message);
      return [];
    }

    return (data as CatalogListingRow[])
      .map(catalogRowToLocation)
      .filter((location): location is Location => Boolean(location));
  } catch (error) {
    console.error("[catalog] listPublishedCatalogLocations", error);
    return [];
  }
}

export async function upsertCatalogLocation(params: {
  location: Location;
  status: ManagedListingStatus;
  ownerId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  try {
    const supabase = getSupabaseAdmin();
    const row: Record<string, unknown> = {
      id: params.location.id,
      kind: "location" as const,
      category: "locali" as const,
      status: params.status,
      name: params.location.name,
      description: params.location.description,
      city: params.location.city,
      address: params.location.address,
      provider_zone: params.location.zoneLabel,
      cover_image_url: params.location.imageUrl || null,
      data: {
        ...params.location,
        id: params.location.id,
      },
      updated_at: new Date().toISOString(),
    };

    if (params.ownerId) {
      row.owner_id = params.ownerId;
    }

    const { error } = await supabase.from("listings").upsert(row, {
      onConflict: "id",
    });

    if (error) {
      console.error("[catalog] upsertCatalogLocation", error.message);
      return { ok: false, error: error.message };
    }

    await syncListingMediaRows({
      listingId: params.location.id,
      imageUrls: params.location.gallery?.length
        ? params.location.gallery
        : params.location.imageUrl
          ? [params.location.imageUrl]
          : [],
    });

    return { ok: true, id: params.location.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore salvataggio catalogo.";
    console.error("[catalog] upsertCatalogLocation", message);
    return { ok: false, error: message };
  }
}

export async function deleteCatalogListing(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase non configurato." };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore eliminazione catalogo.";
    return { ok: false, error: message };
  }
}
