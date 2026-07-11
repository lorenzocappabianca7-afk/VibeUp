export type PartyType =
  | "compleanno"
  | "matrimonio"
  | "aziendale"
  | "laurea"
  | "festa";

export type ExploreCategory =
  | "locali"
  | "dj"
  | "fotografo"
  | "decorazioni"
  | "altri";

export type MusicType =
  | "commerciale"
  | "house"
  | "hip_hop"
  | "latino"
  | "anni_90"
  | "elettronica";

export type DecorationFulfillment = "delivery" | "pickup";

export type GeoArea = "torino_citta" | "dintorni";

export type TorinoDistrict =
  | "centro"
  | "san_salvario"
  | "borgo_po"
  | "aurora";

export type DintorniZone =
  | "moncalieri"
  | "venaria"
  | "rivoli"
  | "collegno"
  | "chieri";

export interface ContactPreview {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface TechnicalDetails {
  surfaceSqm: number;
  parkingSpots: number;
  minHours: number;
  maxGuests: number;
  accessibility: boolean;
  airConditioning: boolean;
  outdoorArea: boolean;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  comune: string;
  regione: "Piemonte";
  address: string;
  geoArea: GeoArea;
  district?: TorinoDistrict;
  zone?: DintorniZone;
  zoneLabel: string;
  distanceBadge?: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  gallery: string[];
  description: string;
  technicalDetails: TechnicalDetails;
  hourlyPrice: number;
  priceModel?: "event" | "person";
  eventPrice?: number;
  personPrice?: number;
  priceBadge?: string;
  capacity: number;
  partyTypes: PartyType[];
  deposit: number;
  includedServices: string[];
  contactsBeenHere: {
    count: number;
    contacts: ContactPreview[];
  };
}

export type ExtraServiceId =
  | "menu"
  | "dj"
  | "photographer"
  | "decorations"
  | "bakery"
  | "catering"
  | "audio_lights";

export type ExtraServicePricing =
  | { type: "fixed"; price: number }
  | { type: "per_kg"; pricePerKg: number; minKg: number; maxKg: number }
  | { type: "per_person"; pricePerPerson: number; minGuests: number };

export interface ExtraService {
  id: ExtraServiceId;
  name: string;
  description: string;
  providerName?: string;
  providerZone?: string;
  pricing: ExtraServicePricing;
}

export interface UserPosition {
  latitude: number;
  longitude: number;
}

export interface ExploreFilters {
  minHourlyPrice: number;
  maxHourlyPrice: number;
  guestCount: number;
  partyType: PartyType | null;
  dateFrom: string | null;
  dateTo: string | null;
  allPiemonte: boolean;
  selectedComune: string | null;
  geoArea: GeoArea | null;
  district: TorinoDistrict | null;
  zone: DintorniZone | null;
  nearMe: boolean;
  userPosition: UserPosition | null;
  venuePreferences: string;
}

export interface ServiceExploreFilters {
  musicType: MusicType | null;
  activityHours: number;
  partyType: PartyType | null;
  viewDecorationsInPerson: boolean;
  decorationFulfillment: DecorationFulfillment | null;
  eventAddress: string;
}
export const EXPLORE_PRICE_MIN = 0;
export const EXPLORE_PRICE_MAX = 3000;
export const EXPLORE_PRICE_STEP = 50;
export const EXPLORE_GUEST_MIN = 10;
export const EXPLORE_GUEST_MAX = 300;
export const EXPLORE_GUEST_STEP = 10;

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  compleanno: "Compleanno",
  matrimonio: "Matrimonio",
  aziendale: "Evento aziendale",
  laurea: "Laurea",
  festa: "Festa",
};

export const MUSIC_TYPE_LABELS: Record<MusicType, string> = {
  commerciale: "Commerciale",
  house: "House",
  hip_hop: "Hip hop",
  latino: "Latino",
  anni_90: "Anni '90",
  elettronica: "Elettronica",
};

export const DECORATION_FULFILLMENT_LABELS: Record<
  DecorationFulfillment,
  string
> = {
  delivery: "Consegna a domicilio",
  pickup: "Ritiro di persona",
};

export const GEO_AREA_LABELS: Record<GeoArea, string> = {
  torino_citta: "Torino Città",
  dintorni: "Dintorni / Provincia",
};

export const DISTRICT_LABELS: Record<TorinoDistrict, string> = {
  centro: "Centro",
  san_salvario: "San Salvario",
  borgo_po: "Borgo Po",
  aurora: "Aurora",
};

export const ZONE_LABELS: Record<DintorniZone, string> = {
  moncalieri: "Moncalieri",
  venaria: "Venaria",
  rivoli: "Rivoli",
  collegno: "Collegno",
  chieri: "Chieri",
};

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  minHourlyPrice: EXPLORE_PRICE_MIN,
  maxHourlyPrice: EXPLORE_PRICE_MAX,
  guestCount: EXPLORE_GUEST_MIN,
  partyType: null,
  dateFrom: null,
  dateTo: null,
  allPiemonte: true,
  selectedComune: null,
  geoArea: null,
  district: null,
  zone: null,
  nearMe: false,
  userPosition: null,
  venuePreferences: "",
};

export const DEFAULT_SERVICE_EXPLORE_FILTERS: ServiceExploreFilters = {
  musicType: null,
  activityHours: 4,
  partyType: null,
  viewDecorationsInPerson: false,
  decorationFulfillment: null,
  eventAddress: "",
};

export interface BookingQuote {
  hours: number;
  locationCost: number;
  extrasCost: number;
  total: number;
  depositAmount: number;
}
