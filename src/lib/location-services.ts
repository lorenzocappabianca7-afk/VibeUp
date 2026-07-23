import type { Location } from "@/types/location";

export type InternalLocationServiceType =
  | "menu"
  | "dj"
  | "photographer"
  | "decorations"
  | "audio_lights"
  | "bar"
  | "other";

export type InternalLocationServicePricing =
  | { type: "included" }
  | { type: "fixed"; price: number }
  | { type: "per_person"; pricePerPerson: number };

export interface InternalLocationService {
  id: string;
  type: InternalLocationServiceType;
  name: string;
  description: string;
  pricing: InternalLocationServicePricing;
  available: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferServiceType(serviceName: string): InternalLocationServiceType {
  const lowered = serviceName.toLowerCase();

  if (lowered.includes("dj")) return "dj";
  if (
    lowered.includes("foto") ||
    lowered.includes("photographer") ||
    lowered.includes("fotografo")
  ) {
    return "photographer";
  }
  if (lowered.includes("catering") || lowered.includes("menu")) return "menu";
  if (lowered.includes("bar")) return "bar";
  if (lowered.includes("luci") || lowered.includes("audio")) return "audio_lights";
  if (lowered.includes("allest") || lowered.includes("decor")) return "decorations";

  return "other";
}

function isSelectablePartyService(serviceName: string): boolean {
  const lowered = serviceName.toLowerCase();
  const nonSelectableKeywords = [
    "wi-fi",
    "wifi",
    "aria condizionata",
    "climatizzata",
    "climatizzato",
    "sala climatizzata",
    "accessibil",
    "parcheggio",
    "ascensore",
  ];

  return !nonSelectableKeywords.some((keyword) => lowered.includes(keyword));
}

export function getInternalLocationServices(
  location: Location,
): InternalLocationService[] {
  const includedServices = location.includedServices
    .filter(isSelectablePartyService)
    .map((serviceName) => ({
      id: `internal-${slugify(serviceName)}`,
      type: inferServiceType(serviceName),
      name: serviceName,
      description:
        "Servizio gestito direttamente dal locale e incluso nella proposta.",
      pricing: { type: "included" } as const,
      available: true,
    }));

  const hasMenu = includedServices.some((service) => service.type === "menu");
  const hasDj = includedServices.some((service) => service.type === "dj");
  const hasPhotographer = includedServices.some(
    (service) => service.type === "photographer",
  );
  const locationText = [
    location.name,
    location.description,
    ...location.includedServices,
  ]
    .join(" ")
    .toLowerCase();
  const canOfferLocalDj =
    !hasDj &&
    (locationText.includes("dj") ||
      locationText.includes("musica") ||
      locationText.includes("impianto audio") ||
      locationText.includes("luci"));
  const canOfferPhotographer =
    !hasPhotographer &&
    (location.partyTypes.includes("matrimonio") ||
      location.partyTypes.includes("laurea") ||
      location.partyTypes.includes("aziendale"));

  const bookableDefaults: InternalLocationService[] = [];

  if (!hasMenu) {
    bookableDefaults.push({
      id: "internal-menu-base",
      type: "menu",
      name: "Menu del locale",
      description: "Menu base personalizzabile in base a ospiti e tipo di festa.",
      pricing: { type: "per_person", pricePerPerson: 28 },
      available: true,
    });
  }

  // Paid drinks / open bar are chosen in the dedicated Bevande block of the quote.

  if (canOfferLocalDj) {
    bookableDefaults.push({
      id: "internal-dj-locale",
      type: "dj",
      name: "DJ del locale",
      description: "DJ partner del locale con set musicale per la serata.",
      pricing: { type: "fixed", price: 420 },
      available: true,
    });
  }

  if (canOfferPhotographer) {
    bookableDefaults.push({
      id: "internal-fotografo-locale",
      type: "photographer",
      name: "Fotografo del locale",
      description: "Fotografo partner della location per reportage evento.",
      pricing: { type: "fixed", price: 360 },
      available: true,
    });
  }

  return [...includedServices, ...bookableDefaults];
}

export function getInternalLocationServicePrice(
  service: InternalLocationService,
  guestCount: number,
): number {
  if (service.pricing.type === "included") return 0;
  if (service.pricing.type === "per_person") {
    return service.pricing.pricePerPerson * guestCount;
  }
  return service.pricing.price;
}
