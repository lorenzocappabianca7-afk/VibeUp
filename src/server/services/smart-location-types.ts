import type {
  BookingQuote,
  ExtraServiceId,
  Location,
  PartyType,
} from "@/types/location";

export type SmartLocationSourceKind = "text" | "email" | "file" | "photo";

export interface SmartLocationInputSource {
  kind: SmartLocationSourceKind;
  content?: string;
  dataUrl?: string;
  fileName?: string;
  mimeType?: string;
}

export type ExtractedServiceType =
  | "menu"
  | "dj"
  | "photographer"
  | "decorations"
  | "catering"
  | "audio_lights"
  | "other";

export type ExtractedPricingUnit = "fixed" | "hour" | "person" | "kg";

export interface ExtractedLocationService {
  id: string;
  type: ExtractedServiceType;
  name: string;
  description?: string;
  price: number;
  pricingUnit: ExtractedPricingUnit;
  included?: boolean;
  minGuests?: number;
  maxGuests?: number;
}

export interface SmartLocationRecord {
  location: Location;
  extraction: LocationExtractionMetadata;
}

export interface LocationExtractionMetadata {
  confidence: number;
  extractedFields: string[];
  priceList: ExtractedLocationService[];
  sourceKinds: SmartLocationSourceKind[];
  suggestedReviewFields: string[];
  rawSummary: string;
  createdAt: string;
}

export interface LocationExtractionResult extends SmartLocationRecord {
  saved: boolean;
}

export interface InstantQuotePreferences {
  locationId?: string;
  location?: Location;
  priceList?: ExtractedLocationService[];
  startTime: string;
  endTime: string;
  guestCount: number;
  partyType?: PartyType;
  selectedServiceIds?: string[];
  selectedExtraServiceIds?: ExtraServiceId[];
  cakeKg?: number;
  budget?: number;
  requiredServices?: ExtractedServiceType[];
}

export interface QuoteLineItem {
  id: string;
  label: string;
  amount: number;
  source: "location" | "internal_service" | "external_service" | "assumption";
  confidence: number;
}

export interface ExternalServiceSuggestion {
  serviceId: ExtraServiceId;
  name: string;
  reason: string;
  estimatedCost: number;
}

export interface InstantQuoteResult {
  quote: BookingQuote;
  lineItems: QuoteLineItem[];
  confidence: number;
  estimatedErrorPct: number;
  minEstimate: number;
  maxEstimate: number;
  assumptions: string[];
  riskFactors: string[];
  externalServiceSuggestions: ExternalServiceSuggestion[];
}
