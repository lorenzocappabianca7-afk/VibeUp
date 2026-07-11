import { extractLocationWithVisionModel } from "@/server/ai/client";
import { saveSmartLocation } from "@/server/repositories/locations";
import type {
  AiExtractedLocationPayload,
} from "@/server/ai/client";
import type {
  ExtractedLocationService,
  ExtractedPricingUnit,
  ExtractedServiceType,
  LocationExtractionMetadata,
  LocationExtractionResult,
  SmartLocationInputSource,
} from "@/server/services/smart-location-types";
import type {
  GeoArea,
  Location,
  PartyType,
  TorinoDistrict,
} from "@/types/location";

const PARTY_TYPES: PartyType[] = [
  "compleanno",
  "matrimonio",
  "aziendale",
  "laurea",
  "festa",
];

const TORINO_DISTRICTS: TorinoDistrict[] = [
  "centro",
  "san_salvario",
  "borgo_po",
  "aurora",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseEuroAmount(value: string): number | undefined {
  const match = value.match(/(?:€|euro)?\s*(\d{2,5})(?:[,.](\d{1,2}))?\s*(?:€|euro)?/i);
  if (!match) return undefined;

  const euros = Number(match[1]);
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) / 100 : 0;
  return euros + cents;
}

function collectText(sources: SmartLocationInputSource[]): string {
  return sources
    .map((source) => source.content ?? "")
    .filter(Boolean)
    .join("\n");
}

function inferPartyTypes(text: string): PartyType[] {
  const lowered = text.toLowerCase();
  const inferred = PARTY_TYPES.filter((type) => lowered.includes(type));
  return inferred.length > 0 ? inferred : ["compleanno", "festa"];
}

function normalizeServiceType(value?: string): ExtractedServiceType {
  const lowered = value?.toLowerCase() ?? "";
  if (lowered.includes("menu")) return "menu";
  if (lowered.includes("dj")) return "dj";
  if (lowered.includes("foto")) return "photographer";
  if (lowered.includes("decor")) return "decorations";
  if (lowered.includes("catering") || lowered.includes("buffet")) return "catering";
  if (lowered.includes("audio") || lowered.includes("luci")) return "audio_lights";
  return "other";
}

function normalizePricingUnit(value?: string): ExtractedPricingUnit {
  const lowered = value?.toLowerCase() ?? "";
  if (lowered.includes("person") || lowered.includes("ospite")) return "person";
  if (lowered.includes("kg")) return "kg";
  if (lowered.includes("hour") || lowered.includes("ora")) return "hour";
  return "fixed";
}

function heuristicExtraction(
  sources: SmartLocationInputSource[],
): AiExtractedLocationPayload {
  const text = collectText(sources);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const hourlyPriceLine = lines.find((line) => /(?:ora|oraria|hourly)/i.test(line));
  const guestLine = lines.find((line) => /(?:ospiti|persone|capienza|capacity)/i.test(line));
  const addressLine = lines.find((line) => /(?:via|corso|piazza|strada)\s+/i.test(line));
  const nameLine = lines.find((line) => /(?:locale|sala|villa|loft|cascina|palazzo)/i.test(line));
  const hourlyPrice = hourlyPriceLine
    ? parseEuroAmount(hourlyPriceLine)
    : parseEuroAmount(text);
  const capacity = guestLine?.match(/\d{2,4}/)?.[0];

  return {
    name: nameLine ?? "Nuova Location VibeUp",
    city: /torino/i.test(text) ? "Torino" : undefined,
    comune: /torino/i.test(text) ? "Torino" : undefined,
    address: addressLine,
    description: lines.slice(0, 3).join(" "),
    capacity: capacity ? Number(capacity) : undefined,
    hourlyPrice,
    includedServices: lines
      .filter((line) => /(?:inclus|servizi|audio|bar|wifi|wi-fi|luci)/i.test(line))
      .slice(0, 5),
    partyTypes: inferPartyTypes(text),
    services: extractServicesFromText(lines),
    confidence: text ? 0.46 : 0.18,
    rawSummary: text.slice(0, 500),
    extractedFields: ["description", "partyTypes"],
    suggestedReviewFields: ["latitude", "longitude", "foto gallery"],
  };
}

function extractServicesFromText(lines: string[]): AiExtractedLocationPayload["services"] {
  return lines
    .filter((line) => /(?:menu|dj|catering|buffet|foto|decor|audio|luci)/i.test(line))
    .map((line) => ({
      type: normalizeServiceType(line),
      name: line.split(/[:|-]/)[0]?.trim() || "Servizio locale",
      description: line,
      price: parseEuroAmount(line),
      pricingUnit: /persona|ospite|cad/i.test(line) ? "person" : "fixed",
      included: /inclus/i.test(line),
    }))
    .filter((service) => service.price || service.included)
    .slice(0, 12);
}

function normalizeServices(
  services: AiExtractedLocationPayload["services"] = [],
): ExtractedLocationService[] {
  return services
    .filter((service) => service.name && typeof service.price === "number")
    .map((service, index) => ({
      id: `${slugify(service.name ?? "servizio")}-${index + 1}`,
      type: normalizeServiceType(service.type ?? service.name),
      name: service.name ?? "Servizio locale",
      description: service.description,
      price: Math.max(0, service.price ?? 0),
      pricingUnit: normalizePricingUnit(service.pricingUnit),
      included: service.included,
      minGuests: service.minGuests,
      maxGuests: service.maxGuests,
    }));
}

function normalizePartyTypes(values: string[] | undefined, text: string): PartyType[] {
  const fromModel = (values ?? [])
    .map((value) => value.toLowerCase().trim())
    .filter((value): value is PartyType =>
      PARTY_TYPES.includes(value as PartyType),
    );

  return fromModel.length > 0 ? Array.from(new Set(fromModel)) : inferPartyTypes(text);
}

function inferDistrict(address: string | undefined): TorinoDistrict | undefined {
  const lowered = address?.toLowerCase() ?? "";
  return TORINO_DISTRICTS.find((district) =>
    lowered.includes(district.replace("_", " ")),
  );
}

function toLocation(
  payload: AiExtractedLocationPayload,
  sources: SmartLocationInputSource[],
): Location {
  const text = collectText(sources);
  const city = payload.city ?? payload.comune ?? "Torino";
  const comune = payload.comune ?? city;
  const geoArea: GeoArea = /torino/i.test(comune) ? "torino_citta" : "dintorni";
  const district = geoArea === "torino_citta" ? inferDistrict(payload.address) : undefined;
  const name = payload.name?.trim() || "Nuova Location VibeUp";

  return {
    id: `loc-ai-${slugify(name)}-${Date.now()}`,
    name,
    city,
    comune,
    regione: "Piemonte",
    address: payload.address ?? "Indirizzo da verificare",
    geoArea,
    district,
    zoneLabel: district ? district.replace("_", " ") : comune,
    latitude: 45.0703,
    longitude: 7.6869,
    imageUrl:
      sources.find((source) => source.dataUrl)?.dataUrl ??
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    gallery: sources
      .filter((source) => source.dataUrl)
      .map((source) => source.dataUrl as string),
    description:
      payload.description ??
      payload.rawSummary ??
      "Location importata tramite gestione smart VibeUp.",
    technicalDetails: {
      surfaceSqm: Math.max(0, payload.surfaceSqm ?? 0),
      parkingSpots: Math.max(0, payload.parkingSpots ?? 0),
      minHours: Math.max(1, payload.minHours ?? 3),
      maxGuests: Math.max(1, payload.capacity ?? 30),
      accessibility: payload.accessibility ?? false,
      airConditioning: payload.airConditioning ?? false,
      outdoorArea: payload.outdoorArea ?? false,
    },
    hourlyPrice: Math.max(0, payload.hourlyPrice ?? 80),
    capacity: Math.max(1, payload.capacity ?? 30),
    partyTypes: normalizePartyTypes(payload.partyTypes, text),
    deposit: Math.round((payload.hourlyPrice ?? 80) * 2),
    includedServices: payload.includedServices?.length
      ? payload.includedServices
      : ["Dettagli importati con IA"],
    contactsBeenHere: { count: 0, contacts: [] },
  };
}

export async function extractAndSaveSmartLocation(
  sources: SmartLocationInputSource[],
): Promise<LocationExtractionResult> {
  if (sources.length === 0) {
    throw new Error("At least one source is required for location extraction");
  }

  const modelPayload =
    (await extractLocationWithVisionModel(sources)) ?? heuristicExtraction(sources);
  const location = toLocation(modelPayload, sources);
  const priceList = normalizeServices(modelPayload.services);
  const confidence = clamp(modelPayload.confidence ?? 0.5, 0, 1);
  const extraction: LocationExtractionMetadata = {
    confidence,
    extractedFields: modelPayload.extractedFields ?? [],
    priceList,
    sourceKinds: Array.from(new Set(sources.map((source) => source.kind))),
    suggestedReviewFields: modelPayload.suggestedReviewFields ?? [],
    rawSummary: modelPayload.rawSummary ?? location.description,
    createdAt: new Date().toISOString(),
  };
  const savedRecord = await saveSmartLocation({ location, extraction });

  return {
    ...savedRecord,
    saved: true,
  };
}
