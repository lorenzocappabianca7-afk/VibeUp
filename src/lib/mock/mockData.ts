import type {
  DintorniZone,
  ExtraService,
  TorinoDistrict,
} from "@/types/location";

export const PIEMONTE_CITY_SUGGESTIONS = [
  "Torino",
  "Moncalieri",
  "Rivoli",
  "Novara",
  "Cuneo",
  "Asti",
  "Alessandria",
  "Venaria",
  "Collegno",
  "Chieri",
] as const;

export const EXTRA_SERVICES: ExtraService[] = [
  {
    id: "menu",
    name: "Menu Food & Drink",
    providerName: "Menu Partner VibeUp",
    providerZone: "Torino e provincia",
    description:
      "Menu per invitato con buffet, soft drink e opzioni vegetariane personalizzabili.",
    pricing: { type: "per_person", pricePerPerson: 32, minGuests: 10 },
  },
  {
    id: "dj",
    name: "DJ",
    description: "Set musicale di 4 ore con impianto professionale",
    pricing: { type: "fixed", price: 450 },
  },
  {
    id: "photographer",
    name: "Fotografo",
    description: "Copertura fotografica dell'evento (3 ore)",
    pricing: { type: "fixed", price: 380 },
  },
  {
    id: "decorations",
    name: "Negozio Decorazioni",
    description: "Pacchetto festa: palloncini, banner e allestimento base",
    pricing: { type: "fixed", price: 220 },
  },
  {
    id: "bakery",
    name: "Pasticceria / Torta",
    description: "Torta personalizzata artigianale",
    pricing: { type: "per_kg", pricePerKg: 35, minKg: 2, maxKg: 8 },
  },
  {
    id: "catering",
    name: "Servizio Catering",
    providerName: "Sapori Subalpini Catering",
    providerZone: "Moncalieri",
    description:
      "Menu buffet piemontese e internazionale. Copertura Torino e provincia.",
    pricing: { type: "per_person", pricePerPerson: 25, minGuests: 15 },
  },
  {
    id: "audio_lights",
    name: "Noleggio Impianti / Luci",
    providerName: "Torino Service Audio-Luci",
    providerZone: "Collegno",
    description:
      "Pacchetto festa con fari LED e casse professionali. Consegna e installazione incluse.",
    pricing: { type: "fixed", price: 180 },
  },
];

export const HOURLY_PRICE_OPTIONS = [
  { label: "Tutti i prezzi", value: null },
  { label: "Fino a €300 / Evento", value: 80 },
  { label: "Fino a €500 / Evento", value: 120 },
  { label: "Fino a €700 / Evento", value: 150 },
  { label: "Fino a €1.000 / Evento", value: 220 },
] as const;

export const CAPACITY_OPTIONS = [
  { label: "Qualsiasi capacità", value: null },
  { label: "Da 30 ospiti", value: 30 },
  { label: "Da 50 ospiti", value: 50 },
  { label: "Da 80 ospiti", value: 80 },
] as const;

export const TORINO_DISTRICTS: { value: TorinoDistrict; label: string }[] = [
  { value: "centro", label: "Centro" },
  { value: "san_salvario", label: "San Salvario" },
  { value: "borgo_po", label: "Borgo Po" },
  { value: "aurora", label: "Aurora" },
];

export const DINTORNI_ZONES: { value: DintorniZone; label: string }[] = [
  { value: "moncalieri", label: "Moncalieri" },
  { value: "venaria", label: "Venaria" },
  { value: "rivoli", label: "Rivoli" },
  { value: "collegno", label: "Collegno" },
  { value: "chieri", label: "Chieri" },
];
