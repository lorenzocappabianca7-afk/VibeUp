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

const SASSI_GALLERY = [
  "/locations/villa-sassi/01-facciata.jpg",
  "/locations/villa-sassi/02-giardino.jpg",
  "/locations/villa-sassi/03-sala-sera.jpg",
  "/locations/villa-sassi/04-sala.jpg",
] as const;

const BEACH_GALLERY = [
  "/locations/the-beach/01-serata.jpg",
  "/locations/the-beach/02-sala.jpg",
  "/locations/the-beach/03-pranzo.jpg",
  "/locations/the-beach/04-consolle.jpg",
] as const;

const NUVOLA_GALLERY = [
  "/locations/spazio-nuvola-9/01-diciottesimo.jpg",
  "/locations/spazio-nuvola-9/02-esterno.jpg",
  "/locations/spazio-nuvola-9/03-sala.jpg",
  "/locations/spazio-nuvola-9/04-open-space.jpg",
] as const;

const DOCKS_GALLERY = [
  "/locations/spazio-docks/01-esterno.jpg",
  "/locations/spazio-docks/02-sala.jpg",
  "/locations/spazio-docks/03-diciottesimo.jpg",
] as const;

const CERIANA_GALLERY = [
  "/locations/palazzo-ceriana/01-facciata.jpg",
  "/locations/palazzo-ceriana/02-sala-specchi.jpg",
  "/locations/palazzo-ceriana/03-sala-pranzo.jpg",
  "/locations/palazzo-ceriana/04-buffet.jpg",
  "/locations/palazzo-ceriana/05-scalone.jpg",
] as const;

const CHEERS_GALLERY = [
  "/locations/cheers-superga/01-esterno.jpg",
  "/locations/cheers-superga/02-terrazza.jpg",
  "/locations/cheers-superga/03-terrazza-sera.jpg",
  "/locations/cheers-superga/04-sala.jpg",
] as const;

const MONTALDO_GALLERY = [
  "/locations/castello-di-montaldo/01-aerea.jpg",
  "/locations/castello-di-montaldo/02-corte.jpg",
  "/locations/castello-di-montaldo/03-sala.jpg",
  "/locations/castello-di-montaldo/04-sala-lampadari.jpg",
  "/locations/castello-di-montaldo/05-notte.jpg",
] as const;

/**
 * Real venues supplied by the team. The public description is atmosphere only:
 * two or three lines on the space and why to celebrate there. Prices stay in
 * the pricing fields, not in `description`.
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
    imageUrl: VITTORINA_GALLERY[0],
    gallery: [...VITTORINA_GALLERY],
    description:
      "La Vittorina sta sul Colle della Maddalena, tra corte, portico e giardino. Le sale si aprono sul verde e la festa resta raccolta, lontana dal centro. È il posto per un ricevimento che vuole aria di collina e tavoli all’aperto.",
    characteristics: ["Collina", "Giardino", "Ricevimenti"],
    ...QUOTE_TERMS,
    includedServices: [
      "Utilizzo delle sale",
      "Chiusura alle 01:30",
      "Wi-Fi",
      "Aria condizionata",
      "Parcheggio privato",
      "Cucina per il catering",
      "Area esterna",
    ],
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
    description:
      "Il Castello della Rovere a Vinovo tiene le feste tra mura storiche e sale che di sera si illuminano. L’ingresso e le volte danno subito il tono di un evento. È la scelta per un compleanno o un ricevimento che vuole il carattere di un castello.",
    characteristics: ["Castello", "Sale", "Ricevimenti"],
    ...QUOTE_TERMS,
    includedServices: [
      "Utilizzo delle sale",
      "Chiusura alle 01:30",
      "Parco",
    ],
  },
  {
    id: "loc-villa-sassi",
    name: "Villa Sassi",
    city: "",
    comune: "",
    regione: "Piemonte",
    address: "",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: SASSI_GALLERY[0],
    gallery: [...SASSI_GALLERY],
    description:
      "Villa Sassi è una villa con giardino e sale da sera. Fuori c’è il verde, dentro le luci di una festa già pronta. Ci si festeggia un diciottesimo o un compleanno con il gruppo insieme, tra giardino e saloni.",
    characteristics: ["Villa", "Giardino", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "event",
    eventPrice: 2500,
    hourlyPrice: 2500,
    priceBadge: "IVA esclusa",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 750,
    includedServices: ["Parcheggio privato"],
    availableServices: [
      {
        name: "DJ",
        description: "Circa 600 €, IVA esclusa.",
        pricing: { type: "fixed", price: 600 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-the-beach",
    name: "The Beach",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "",
    geoArea: "torino_citta",
    zoneLabel: "Murazzi",
    imageUrl: BEACH_GALLERY[0],
    gallery: [...BEACH_GALLERY],
    description:
      "The Beach sta ai Murazzi, con sala, tavoli e consolle sul Po. Di sera la location diventa una festa: luci, musica e il fiume fuori. È il compleanno per chi vuole l’energia di una serata in città.",
    characteristics: ["Murazzi", "Sala", "Serata"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "person",
    personPrice: 22,
    hourlyPrice: 22,
    priceBadge: "Formula di partenza, a persona",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 0,
    includedServices: [
      "Catering",
      "DJ",
      "Aperitivo: 6 antipastini e primo caldo",
      "1 consumazione a scelta",
      "Tavolo riservato fino alle 23:30",
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-spazio-nuvola-9",
    name: "Spazio Nuvola 9",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Corso Moncalieri 506/28, 10133 Torino",
    geoArea: "torino_citta",
    zoneLabel: "Corso Moncalieri",
    imageUrl: NUVOLA_GALLERY[0],
    gallery: [...NUVOLA_GALLERY],
    description:
      "Spazio Nuvola 9, in Corso Moncalieri, si prende in esclusiva per il vostro gruppo. Open space, esterno quando la stagione lo permette, e una zona dance già pronta. Funziona per un diciottesimo in cui lo spazio è solo vostro, dalla cena al ballo.",
    characteristics: ["Open space", "Esterno", "Esclusiva"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 80,
      outdoorArea: true,
    },
    priceModel: "event",
    eventPrice: 700,
    hourlyPrice: 700,
    priceBadge: "Listino 2025, in base agli invitati",
    guestPriceTiers: [
      { maxGuests: 30, price: 700 },
      { maxGuests: 50, price: 800 },
      { maxGuests: 80, price: 900 },
    ],
    capacity: 80,
    partyTypes: ["compleanno", "festa"],
    deposit: 210,
    includedServices: [
      "Location 18:30–02:00 oppure 14:00–20:00",
      "Uso esclusivo della location",
      "Spazio all’aperto, in base alla stagione",
      "Cucina per cibi freddi e finger food",
      "Pulizia durante l’evento",
      "Impianto audio Bose",
      "Luci per la zona dance e il bar",
      "Frigorifero con congelatore",
      "Tavoli per il buffet",
      "Sedie e tavolini",
    ],
    availableServices: [
      {
        name: "DJ",
        description: "200 € se si chiede un DJ. In alternativa si usa una playlist sull’impianto Bose.",
        pricing: { type: "fixed", price: 200 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-spazio-docks",
    name: "Spazio Docks",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Via Valprato 68, 10155 Torino",
    geoArea: "torino_citta",
    zoneLabel: "Docks Dora",
    imageUrl: DOCKS_GALLERY[0],
    gallery: [...DOCKS_GALLERY],
    description:
      "Spazio Docks è ai Docks Dora, in un ambiente industriale con sala e veranda. La location resta in esclusiva per la vostra festa, fino a tardi. È il diciottesimo per chi vuole un posto urbano, non una sala da pranzo classica.",
    characteristics: ["Docks", "Esclusiva", "Veranda"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
      outdoorArea: true,
    },
    priceModel: "event",
    eventPrice: 600,
    hourlyPrice: 600,
    priceBadge: "Affitto 500 € + sicurezza 100 €",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 180,
    includedServices: [
      "Location in esclusiva fino alle 02:00",
      "Allestimento della sala",
      "Personale",
      "Addetto alla sicurezza",
      "Ingresso pedonale",
    ],
    availableServices: [
      {
        name: "Catering apericena",
        description:
          "38 € + IVA 10% a persona. Minimo 30 persone. Analcolico libero, 2 drink e sbicchierata. Dalle 20:00/20:30.",
        pricing: { type: "per_person", pricePerPerson: 38, minGuests: 30 },
      },
      {
        name: "DJ",
        description: "300 € con attrezzatura, oppure di vostra competenza.",
        pricing: { type: "fixed", price: 300 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-palazzo-ceriana",
    name: "Palazzo Ceriana",
    city: "",
    comune: "",
    regione: "Piemonte",
    address: "",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: CERIANA_GALLERY[0],
    gallery: [...CERIANA_GALLERY],
    description:
      "Palazzo Ceriana accoglie le feste in un palazzo con scalone, sala degli specchi e sale da pranzo. Gli spazi sono già scenografici: si entra e la serata ha l’aria di un ricevimento. Ideale per chi vuole eleganza e sale grandi.",
    characteristics: ["Palazzo", "Specchi", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "event",
    eventPrice: 2000,
    hourlyPrice: 2000,
    priceBadge: "IVA 22% esclusa",
    capacity: 0,
    partyTypes: ["festa"],
    deposit: 600,
    includedServices: [],
    availableServices: [
      {
        name: "Catering cena a buffet",
        description:
          "40 € + IVA 10% a persona. Minimo 40. Finger, primo caldo, dolci al cucchiaio e buvette dei vini aperta per tutta la cena.",
        pricing: { type: "per_person", pricePerPerson: 40, minGuests: 40 },
      },
      {
        name: "Cocktail dopo cena",
        description: "6 € + IVA 10% a persona.",
        pricing: { type: "per_person", pricePerPerson: 6 },
      },
      {
        name: "DJ",
        description: "Cachet di un DJ esterno: 200 € + IVA 22%.",
        pricing: { type: "fixed", price: 200 },
      },
      {
        name: "Luci e consolle",
        description: "Attrezzatura luci ballo e consolle: 150 € + IVA 22%.",
        pricing: { type: "fixed", price: 150 },
      },
      {
        name: "Diritti SIAE",
        description: "150 € + IVA 22%. La location può occuparsi della richiesta.",
        pricing: { type: "fixed", price: 150 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-cheers-superga",
    name: "Cheers Bistrot Superga",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Str. Basilica di Superga 45, Torino",
    geoArea: "torino_citta",
    zoneLabel: "Superga",
    imageUrl: CHEERS_GALLERY[0],
    gallery: [...CHEERS_GALLERY],
    description:
      "Cheers Bistrot Superga è sul colle, accanto alla basilica, con terrazza e sala. Si cena con Torino sotto e, per i gruppi più piccoli, una saletta solo vostra. È la festa che vuole panorama e l’aria di un bistrot di collina.",
    characteristics: ["Superga", "Terrazza", "Sala"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 30,
      outdoorArea: true,
    },
    priceModel: "person",
    personPrice: 35,
    hourlyPrice: 35,
    priceBadge: "Menù di partenza, a persona",
    capacity: 30,
    partyTypes: ["compleanno", "festa", "aziendale"],
    deposit: 0,
    includedServices: [
      "Opzione Soft",
      "Acqua e caffè",
      "Vino: 1 bottiglia ogni 4 persone",
    ],
    availableServices: [
      {
        name: "Torta o dolce",
        description:
          "3 € a persona, minimo 10. Pan di Spagna al cioccolato o alla crema, tiramisù o cheesecake ai frutti di bosco.",
        pricing: { type: "per_person", pricePerPerson: 3, minGuests: 10 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-castello-di-montaldo",
    name: "Castello di Montaldo",
    city: "Montaldo Torinese",
    comune: "Montaldo Torinese",
    regione: "Piemonte",
    address: "Piazza Superga, 1, 10020 Montaldo Torinese (TO)",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: MONTALDO_GALLERY[0],
    gallery: [...MONTALDO_GALLERY],
    description:
      "Il Castello di Montaldo sta a Montaldo Torinese, con corte, sale e lampadari. Di sera il castello si accende e la festa prende le sale e il cortile. È la scelta per un diciottesimo che vuole un posto memorabile.",
    characteristics: ["Castello", "Corte", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
      outdoorArea: true,
    },
    priceModel: "person",
    personPrice: 75,
    hourlyPrice: 75,
    priceBadge: "Proposta di partenza, IVA 10% esclusa",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 0,
    includedServices: [
      "Aperitivo reale",
      "1 primo a passaggio",
      "Torta",
      "Bevande illimitate",
      "Location inclusa nel prezzo",
    ],
    availableServices: [
      {
        name: "Aperitivo reale",
        description: "Incluso nella proposta, insieme al primo e alla torta.",
        pricing: { type: "included" },
      },
      {
        name: "Bevande illimitate",
        description:
          "Vino bianco, bollicine, miscelati alcolici, cocktail analcolici, acqua e bevande gasate.",
        pricing: { type: "included" },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
];
