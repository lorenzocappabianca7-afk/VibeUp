import type { AvailableLocationService, Location } from "@/types/location";

/** Net amounts from the Popup Location quote (3 August 2026). VAT is in the copy. */
const QUOTE_SERVICES: AvailableLocationService[] = [
  {
    name: "Cena a buffet",
    description:
      "40 € + IVA 10% a persona. Minimo 40 partecipanti. Una decina di finger, un primo caldo, dolci al cucchiaio e buffet vini (prosecco, spritz, analcolici) per tutta la durata della cena.",
    pricing: { type: "per_person", pricePerPerson: 40 },
  },
  {
    name: "Cocktail dopo cena",
    description: "6 € + IVA 10% a persona. Opzionale.",
    pricing: { type: "per_person", pricePerPerson: 6 },
  },
  {
    name: "Cachet DJ esterno",
    description: "200 € + IVA 22% se portate un artista esterno. Opzionale.",
    pricing: { type: "fixed", price: 200 },
  },
  {
    name: "Attrezzatura tecnica luci e console",
    description: "150 € + IVA 22%. Opzionale, insieme al DJ esterno.",
    pricing: { type: "fixed", price: 150 },
  },
  {
    name: "Diritti SIAE",
    description:
      "150 € + IVA 22% se la richiesta agli uffici di competenza la gestisce la location.",
    pricing: { type: "fixed", price: 150 },
  },
];

const QUOTE_DESCRIPTION_TAIL =
  "L’affitto delle sale è 1.200 € + IVA 22% a serata, con chiusura alle 01:30. La cena a buffet (finger, primo caldo, dolci e buffet vini per tutta la cena) è 40 € + IVA 10% a persona, con un minimo di 40 partecipanti. È obbligatoria la presenza di un addetto alla sicurezza ogni 25/30 invitati, a 120 € + IVA 22% cadauno.";

const QUOTE_TERMS = {
  technicalDetails: {
    surfaceSqm: 0,
    parkingSpots: 0,
    minHours: 0,
    maxGuests: 0,
  },
  priceModel: "event" as const,
  eventPrice: 1200,
  hourlyPrice: 1200,
  priceBadge: "IVA 22% esclusa",
  capacity: 0,
  partyTypes: ["compleanno", "festa", "matrimonio"] as Location["partyTypes"],
  deposit: 360,
  includedServices: ["Utilizzo delle sale", "Chiusura alle 01:30"],
  availableServices: QUOTE_SERVICES,
  drinksPricing: {
    drinkUnitPrice: 6,
    openBarPerInvitee: 6,
  },
  contactsBeenHere: { count: 0, contacts: [] },
  latitude: 0,
  longitude: 0,
};

const VITTORINA_GALLERY = [
  "/locations/la-vittorina/01-corte.jpg",
  "/locations/la-vittorina/02-facciata.jpg",
  "/locations/la-vittorina/03-portico.jpg",
  "/locations/la-vittorina/04-sala.jpg",
  "/locations/la-vittorina/05-tavoli.jpg",
] as const;

const ROVERE_GALLERY = [
  "/locations/castello-della-rovere/01-aerea.jpg",
  "/locations/castello-della-rovere/02-facciata.jpg",
  "/locations/castello-della-rovere/03-sala.jpg",
  "/locations/castello-della-rovere/04-sala-sera.jpg",
] as const;

/**
 * Real venues supplied by the team. Prices are the net amounts from the
 * Popup Location quote (3 August 2026); VAT is stated in the copy.
 */
export const PARTNER_LOCATIONS: Location[] = [
  {
    id: "loc-vittorina",
    name: "La Vittorina",
    city: "Moncalieri",
    comune: "Moncalieri",
    regione: "Piemonte",
    address:
      "Strada alla vetta del Colle della Maddalena 170/4, 10024 Moncalieri",
    geoArea: "dintorni",
    zone: "moncalieri",
    zoneLabel: "Moncalieri",
    latitude: 0,
    longitude: 0,
    imageUrl: VITTORINA_GALLERY[0],
    gallery: [...VITTORINA_GALLERY],
    description: `Location sul Colle della Maddalena, a Moncalieri. ${QUOTE_DESCRIPTION_TAIL}`,
    characteristics: ["Collina", "Giardino", "Ricevimenti"],
    ...QUOTE_TERMS,
  },
  {
    id: "loc-castello-della-rovere",
    name: "Castello della Rovere",
    city: "Vinovo",
    comune: "Vinovo",
    regione: "Piemonte",
    address: "Via del Castello 2, 10048 Vinovo",
    geoArea: "dintorni",
    zoneLabel: "Vinovo",
    imageUrl: ROVERE_GALLERY[0],
    gallery: [...ROVERE_GALLERY],
    description: `Castello a Vinovo. ${QUOTE_DESCRIPTION_TAIL}`,
    characteristics: ["Castello", "Sale", "Ricevimenti"],
    ...QUOTE_TERMS,
  },
];
