import type { ManagedLocationListing } from "@/types/admin";
import type {
  AvailableLocationService,
  DintorniZone,
  GeoArea,
  Location,
  PartyType,
  TorinoDistrict,
} from "@/types/location";
import {
  DISTRICT_LABELS,
  GEO_AREA_LABELS,
  ZONE_LABELS,
} from "@/types/location";

export type LocationPriceModel = "event" | "person";

export type AvailableServiceFormRow = {
  name: string;
  pricingType: "included" | "fixed" | "per_person";
  price: string;
  description: string;
};

export type LocationPublishFormData = {
  name: string;
  address: string;
  city: string;
  geoArea: GeoArea;
  district: TorinoDistrict | "";
  zone: DintorniZone | "";
  partyTypes: PartyType[];
  description: string;
  capacity: string;
  surfaceSqm: string;
  parkingSpots: string;
  minHours: string;
  accessibility: boolean;
  airConditioning: boolean;
  outdoorArea: boolean;
  includedServices: string;
  availableServices: AvailableServiceFormRow[];
  drinkUnitPrice: string;
  openBarPerInvitee: string;
  priceModel: LocationPriceModel;
  /** Prezzo a serata (event) oppure a persona (person). */
  listPrice: string;
  imageUrl: string;
  galleryImageUrls: string[];
};

export const EMPTY_AVAILABLE_SERVICE_ROW = (): AvailableServiceFormRow => ({
  name: "",
  pricingType: "included",
  price: "",
  description: "",
});

export const EMPTY_LOCATION_PUBLISH_FORM = (): LocationPublishFormData => ({
  name: "",
  address: "",
  city: "Torino",
  geoArea: "torino_citta",
  district: "centro",
  zone: "",
  partyTypes: ["festa"],
  description: "",
  capacity: "50",
  surfaceSqm: "80",
  parkingSpots: "0",
  minHours: "3",
  accessibility: true,
  airConditioning: true,
  outdoorArea: false,
  includedServices: "Wi-Fi, Aria condizionata",
  availableServices: [
    {
      name: "Menu del locale",
      pricingType: "per_person",
      price: "28",
      description: "",
    },
    {
      name: "Open bar",
      pricingType: "included",
      price: "",
      description: "Incluso o da selezionare in preventivo",
    },
  ],
  drinkUnitPrice: "6",
  openBarPerInvitee: "16",
  priceModel: "event",
  listPrice: "400",
  imageUrl: "",
  galleryImageUrls: [],
});

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";

const TORINO_COORDS: Record<TorinoDistrict, { lat: number; lng: number }> = {
  centro: { lat: 45.0703, lng: 7.6869 },
  san_salvario: { lat: 45.0578, lng: 7.6789 },
  borgo_po: { lat: 45.0635, lng: 7.6985 },
  aurora: { lat: 45.0822, lng: 7.6821 },
};

const DINTORNI_COORDS: Record<DintorniZone, { lat: number; lng: number }> = {
  moncalieri: { lat: 45.0, lng: 7.69 },
  venaria: { lat: 45.13, lng: 7.63 },
  rivoli: { lat: 45.07, lng: 7.52 },
  collegno: { lat: 45.08, lng: 7.57 },
  chieri: { lat: 45.01, lng: 7.83 },
};

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toAvailableServices(
  rows: AvailableServiceFormRow[],
): AvailableLocationService[] {
  return rows
    .map((row) => {
      const name = row.name.trim();
      if (!name) return null;

      const amount = Number(row.price);
      let pricing: AvailableLocationService["pricing"] = { type: "included" };
      if (row.pricingType === "fixed" && Number.isFinite(amount) && amount >= 0) {
        pricing = { type: "fixed", price: amount };
      } else if (
        row.pricingType === "per_person" &&
        Number.isFinite(amount) &&
        amount >= 0
      ) {
        pricing = { type: "per_person", pricePerPerson: amount };
      }

      const description = row.description.trim();
      return {
        name,
        ...(description ? { description } : {}),
        pricing,
      } satisfies AvailableLocationService;
    })
    .filter((item): item is AvailableLocationService => item != null);
}

export function validateLocationPublishForm(
  form: LocationPublishFormData,
): string | null {
  if (!form.name.trim()) return "Inserisci il nome della location.";
  if (!form.address.trim()) return "Inserisci l’indirizzo.";
  if (!form.city.trim()) return "Inserisci la città.";
  if (form.partyTypes.length === 0) {
    return "Seleziona almeno un tipo di festa ospitata.";
  }
  if (form.geoArea === "torino_citta" && !form.district) {
    return "Seleziona la zona di Torino.";
  }
  if (form.geoArea === "dintorni" && !form.zone) {
    return "Seleziona la zona nei dintorni.";
  }

  const capacity = Number(form.capacity);
  if (!Number.isFinite(capacity) || capacity < 1) {
    return "Indica una capienza valida.";
  }

  const listPrice = Number(form.listPrice);
  if (!Number.isFinite(listPrice) || listPrice < 0) {
    return "Indica un prezzo valido per il preventivo.";
  }

  const drinkUnit = Number(form.drinkUnitPrice);
  const openBar = Number(form.openBarPerInvitee);
  if (!Number.isFinite(drinkUnit) || drinkUnit < 0) {
    return "Indica un costo drink valido.";
  }
  if (!Number.isFinite(openBar) || openBar < 0) {
    return "Indica un costo open bar valido.";
  }

  if (form.galleryImageUrls.length === 0 && !form.imageUrl.trim()) {
    return "Aggiungi almeno una foto della location.";
  }

  return null;
}

function resolveZoneLabel(form: LocationPublishFormData): string {
  if (form.geoArea === "torino_citta" && form.district) {
    return `${DISTRICT_LABELS[form.district]} · Torino`;
  }
  if (form.geoArea === "dintorni" && form.zone) {
    return ZONE_LABELS[form.zone];
  }
  return form.city.trim() || GEO_AREA_LABELS[form.geoArea];
}

function resolveCoords(form: LocationPublishFormData) {
  if (form.geoArea === "torino_citta" && form.district) {
    return TORINO_COORDS[form.district];
  }
  if (form.geoArea === "dintorni" && form.zone) {
    return DINTORNI_COORDS[form.zone];
  }
  return TORINO_COORDS.centro;
}

/** Base location cost for quotes from published price model. */
export function getLocationListBaseCost(
  location: Pick<
    Location,
    "priceModel" | "eventPrice" | "personPrice" | "hourlyPrice" | "capacity"
  >,
  params: { hours: number; guestCount: number },
): number {
  const model = location.priceModel ?? "event";
  const guestCount = Math.max(1, params.guestCount);

  if (model === "person") {
    const person =
      location.personPrice ??
      Math.max(
        18,
        Math.round(
          (location.hourlyPrice * 4) / Math.max(20, location.capacity || 20),
        ),
      );
    return person * guestCount;
  }

  return location.eventPrice ?? location.hourlyPrice * Math.max(params.hours, 1);
}

export function buildLocationFromPublishForm(
  form: LocationPublishFormData,
  options?: { id?: string },
): Location {
  const capacity = Number(form.capacity) || 50;
  const minHours = Number(form.minHours) || 3;
  const listPrice = Number(form.listPrice) || 0;
  const includedServices = parseCommaList(form.includedServices);
  const availableServices = toAvailableServices(form.availableServices);
  const gallery =
    form.galleryImageUrls.length > 0
      ? form.galleryImageUrls
      : [form.imageUrl.trim() || FALLBACK_IMAGE];
  const coords = resolveCoords(form);
  const city = form.city.trim() || "Torino";

  const priceModel = form.priceModel;
  const eventPrice = priceModel === "event" ? listPrice : undefined;
  const personPrice = priceModel === "person" ? listPrice : undefined;
  // Keep hourlyPrice for legacy filters / hour labels: serata ÷ min hours, or persona×capienza÷min hours
  const hourlyPrice =
    priceModel === "event"
      ? Math.round(listPrice / Math.max(minHours, 1))
      : Math.round((listPrice * capacity) / Math.max(minHours, 1) / 4) || listPrice;

  return {
    id: options?.id ?? crypto.randomUUID(),
    name: form.name.trim() || "Nuova location",
    city,
    comune: city,
    regione: "Piemonte",
    address: form.address.trim() || "Indirizzo da completare",
    geoArea: form.geoArea,
    ...(form.geoArea === "torino_citta" && form.district
      ? { district: form.district }
      : {}),
    ...(form.geoArea === "dintorni" && form.zone ? { zone: form.zone } : {}),
    zoneLabel: resolveZoneLabel(form),
    latitude: coords.lat,
    longitude: coords.lng,
    imageUrl: gallery[0],
    gallery,
    description:
      form.description.trim() ||
      "Location gestita dal catalogo privato VibeUp.",
    technicalDetails: {
      surfaceSqm: Number(form.surfaceSqm) || 0,
      parkingSpots: Number(form.parkingSpots) || 0,
      minHours,
      maxGuests: capacity,
      accessibility: form.accessibility,
      airConditioning: form.airConditioning,
      outdoorArea: form.outdoorArea,
    },
    hourlyPrice,
    priceModel,
    ...(eventPrice != null ? { eventPrice } : {}),
    ...(personPrice != null ? { personPrice } : {}),
    priceBadge:
      priceModel === "person" ? "Tariffa a persona" : "Tariffa a serata",
    capacity,
    partyTypes: form.partyTypes,
    deposit: Math.round(
      (priceModel === "person" ? listPrice * Math.min(capacity, 30) : listPrice) *
        0.3,
    ),
    includedServices:
      includedServices.length > 0 ? includedServices : ["Dettagli da completare"],
    ...(availableServices.length > 0 ? { availableServices } : {}),
    drinksPricing: {
      drinkUnitPrice: Number(form.drinkUnitPrice) || 6,
      openBarPerInvitee: Number(form.openBarPerInvitee) || 16,
    },
    contactsBeenHere: { count: 0, contacts: [] },
  };
}

export function locationToPublishForm(location: Location): LocationPublishFormData {
  const listPrice =
    location.priceModel === "person"
      ? String(location.personPrice ?? "")
      : String(location.eventPrice ?? location.hourlyPrice * 4);

  return {
    name: location.name,
    address: location.address,
    city: location.city,
    geoArea: location.geoArea,
    district: location.district ?? "",
    zone: location.zone ?? "",
    partyTypes: [...location.partyTypes],
    description: location.description,
    capacity: String(location.capacity),
    surfaceSqm: String(location.technicalDetails.surfaceSqm || ""),
    parkingSpots: String(location.technicalDetails.parkingSpots || ""),
    minHours: String(location.technicalDetails.minHours || 3),
    accessibility: location.technicalDetails.accessibility,
    airConditioning: location.technicalDetails.airConditioning,
    outdoorArea: location.technicalDetails.outdoorArea,
    includedServices: location.includedServices.join(", "),
    availableServices:
      location.availableServices?.map((service) => ({
        name: service.name,
        pricingType: service.pricing.type,
        price:
          service.pricing.type === "fixed"
            ? String(service.pricing.price)
            : service.pricing.type === "per_person"
              ? String(service.pricing.pricePerPerson)
              : "",
        description: service.description ?? "",
      })) ?? [],
    drinkUnitPrice: String(location.drinksPricing?.drinkUnitPrice ?? 6),
    openBarPerInvitee: String(location.drinksPricing?.openBarPerInvitee ?? 16),
    priceModel: location.priceModel ?? "event",
    listPrice,
    imageUrl: location.imageUrl,
    galleryImageUrls: location.gallery.slice(),
  };
}

export function buildManagedLocationListing(params: {
  form: LocationPublishFormData;
  status: "draft" | "pending_review" | "published";
  source: "admin" | "business";
  submitterEmail?: string;
  existingId?: string;
}): ManagedLocationListing {
  const location = buildLocationFromPublishForm(params.form, {
    id: params.existingId,
  });
  const published = params.status === "published";

  return {
    id: location.id,
    category: "locali",
    location,
    menu: "",
    published,
    status: params.status,
    source: params.source,
    ...(params.submitterEmail
      ? { submitterEmail: params.submitterEmail }
      : {}),
    updatedAt: new Date().toISOString(),
  };
}
