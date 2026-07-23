import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import {
  calculateHours,
  getExtraServicePrice,
} from "@/lib/location";
import { getSmartLocationById } from "@/server/repositories/locations";
import type {
  BookingQuote,
  ExtraService,
  ExtraServiceId,
} from "@/types/location";
import type {
  ExtractedLocationService,
  ExtractedServiceType,
  ExternalServiceSuggestion,
  InstantQuotePreferences,
  InstantQuoteResult,
  QuoteLineItem,
} from "@/server/services/smart-location-types";

const SERVICE_TYPE_TO_EXTRA_ID: Partial<Record<ExtractedServiceType, ExtraServiceId>> = {
  menu: "menu",
  dj: "dj",
  photographer: "photographer",
  decorations: "decorations",
  catering: "catering",
  audio_lights: "audio_lights",
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateExtractedServicePrice(
  service: ExtractedLocationService,
  params: { guestCount: number; hours: number; cakeKg: number },
): number {
  if (service.included) return 0;

  if (service.pricingUnit === "person") {
    return service.price * Math.max(params.guestCount, service.minGuests ?? 0);
  }

  if (service.pricingUnit === "hour") {
    return service.price * params.hours;
  }

  if (service.pricingUnit === "kg") {
    return service.price * params.cakeKg;
  }

  return service.price;
}

function getExtraServiceById(id: ExtraServiceId): ExtraService | undefined {
  return EXTRA_SERVICES.find((service) => service.id === id);
}

function buildExternalSuggestion(
  type: ExtractedServiceType,
  params: { guestCount: number; cakeKg: number },
): ExternalServiceSuggestion | null {
  const extraId = SERVICE_TYPE_TO_EXTRA_ID[type];
  if (!extraId) return null;

  const service = getExtraServiceById(extraId);
  if (!service) return null;

  return {
    serviceId: extraId,
    name: service.name,
    reason:
      type === "menu"
        ? "Il locale non espone un menu sufficiente: propongo un menu aggiuntivo compatibile."
        : "Servizio non disponibile o non sufficiente nel locale: propongo un fornitore esterno adatto.",
    estimatedCost: getExtraServicePrice(service, {
      cakeKg: params.cakeKg,
      guestCount: params.guestCount,
    }),
  };
}

function scoreConfidence(params: {
  hasStoredExtraction: boolean;
  locationPriceKnown: boolean;
  selectedInternalServices: number;
  missingRequiredServices: number;
  guestCountFitsCapacity: boolean;
}): number {
  let score = params.hasStoredExtraction ? 0.78 : 0.68;
  if (params.locationPriceKnown) score += 0.08;
  if (params.selectedInternalServices > 0) score += 0.06;
  if (params.guestCountFitsCapacity) score += 0.04;
  score -= params.missingRequiredServices * 0.08;

  return Math.min(Math.max(score, 0.35), 0.94);
}

export async function generateInstantQuote(
  preferences: InstantQuotePreferences,
): Promise<InstantQuoteResult> {
  const storedRecord = preferences.locationId
    ? await getSmartLocationById(preferences.locationId)
    : null;
  const location = preferences.location ?? storedRecord?.location;

  if (!location) {
    throw new Error("A locationId or location payload is required");
  }

  const priceList = preferences.priceList ?? storedRecord?.extraction.priceList ?? [];
  const guestCount = Math.max(1, preferences.guestCount);
  const cakeKg = preferences.cakeKg ?? Math.max(2, Math.ceil(guestCount / 12));
  const rawHours = calculateHours(preferences.startTime, preferences.endTime);
  const hours = Math.max(rawHours, location.technicalDetails.minHours);
  const locationCost = roundCurrency(hours * location.hourlyPrice);
  const selectedInternalServices = priceList.filter((service) =>
    preferences.selectedServiceIds?.includes(service.id),
  );
  const lineItems: QuoteLineItem[] = [
    {
      id: "location",
      label: `${location.name} (${hours}h)`,
      amount: locationCost,
      source: "location",
      confidence: location.hourlyPrice > 0 ? 0.9 : 0.55,
    },
  ];

  for (const service of selectedInternalServices) {
    lineItems.push({
      id: service.id,
      label: service.name,
      amount: roundCurrency(
        calculateExtractedServicePrice(service, { guestCount, hours, cakeKg }),
      ),
      source: "internal_service",
      confidence: storedRecord ? storedRecord.extraction.confidence : 0.72,
    });
  }

  for (const extraId of preferences.selectedExtraServiceIds ?? []) {
    const extraService = getExtraServiceById(extraId);
    if (!extraService) continue;

    lineItems.push({
      id: extraService.id,
      label: extraService.name,
      amount: roundCurrency(
        getExtraServicePrice(extraService, { cakeKg, guestCount }),
      ),
      source: "external_service",
      confidence: 0.82,
    });
  }

  const availableTypes = new Set(priceList.map((service) => service.type));
  const selectedTypes = new Set(selectedInternalServices.map((service) => service.type));
  const requiredServices = preferences.requiredServices ?? [];
  const missingRequiredTypes = requiredServices.filter(
    (type) => !availableTypes.has(type) && !selectedTypes.has(type),
  );
  const externalServiceSuggestions = missingRequiredTypes
    .map((type) => buildExternalSuggestion(type, { guestCount, cakeKg }))
    .filter((suggestion): suggestion is ExternalServiceSuggestion => Boolean(suggestion));
  const extrasCost = roundCurrency(
    lineItems
      .filter((item) => item.id !== "location")
      .reduce((sum, item) => sum + item.amount, 0),
  );
  const total = roundCurrency(locationCost + extrasCost);
  const quote: BookingQuote = {
    hours,
    locationCost,
    extrasCost,
    drinksCost: 0,
    total,
    depositAmount: roundCurrency(locationCost * 0.3),
  };
  const confidence = scoreConfidence({
    hasStoredExtraction: Boolean(storedRecord),
    locationPriceKnown: location.hourlyPrice > 0,
    selectedInternalServices: selectedInternalServices.length,
    missingRequiredServices: missingRequiredTypes.length,
    guestCountFitsCapacity: guestCount <= location.capacity,
  });
  const estimatedErrorPct = roundCurrency((1 - confidence) * 100);
  const errorMultiplier = 1 - confidence;
  const assumptions = [
    rawHours < location.technicalDetails.minHours
      ? `Applicata durata minima del locale: ${location.technicalDetails.minHours} ore.`
      : null,
    "I prezzi estratti da foto/listini hanno priorita' sui fallback dei servizi esterni.",
    "Il deposito e' stimato al 30% del costo della location.",
  ].filter((assumption): assumption is string => Boolean(assumption));
  const riskFactors = [
    guestCount > location.capacity
      ? "Numero ospiti superiore alla capienza dichiarata del locale."
      : null,
    missingRequiredTypes.length > 0
      ? "Alcuni servizi richiesti non sono coperti dal locale e richiedono fornitori esterni."
      : null,
    storedRecord?.extraction.suggestedReviewFields.length
      ? `Campi da verificare: ${storedRecord.extraction.suggestedReviewFields.join(", ")}.`
      : null,
  ].filter((risk): risk is string => Boolean(risk));

  return {
    quote,
    lineItems,
    confidence,
    estimatedErrorPct,
    minEstimate: roundCurrency(total * (1 - errorMultiplier)),
    maxEstimate: roundCurrency(total * (1 + errorMultiplier)),
    assumptions,
    riskFactors,
    externalServiceSuggestions,
  };
}
