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
      "Villa Sassi ospita anche i diciottesimi. L’affitto parte da 2.500 €, IVA esclusa. Il catering è interno e il prezzo del menù si valuta insieme. Il DJ costa circa 600 €, IVA esclusa. Per il fotografo la location mette in contatto con i propri partner.",
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
    includedServices: [],
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
      "The Beach ai Murazzi. Per i compleanni le formule di partenza includono catering e DJ. Il prezzo in scheda è la formula Solo aperitivo: 22 € a persona, dalle 20:30 alle 23:30, con aperitivo (6 antipastini e primo caldo), 1 consumazione a scelta e tavolo riservato fino alle 23:30. Aperitivo + serata, dalle 20:30 fino all’alba: 30 € a persona, con aperitivo e 2 consumazioni, tavolo fino alle 23:30 e ingresso alla serata. Aperitivo + tavolo, dalle 20:30 fino all’alba: 40 € a persona, con aperitivo e 1 consumazione, tavolo per tutta la serata e 1 bottiglia base ogni 5 persone oppure 2 consumazioni. Ci sono proposte vegetariane, vegane, gluten free e senza lattosio.",
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
      "Spazio Nuvola 9, in Corso Moncalieri, è una location in esclusiva per feste private, anche i diciottesimi. Il listino 2025 per la serata 18:30–02:00, oppure 14:00–20:00, è 700 € fino a 30 invitati, 800 € fino a 50 e 900 € fino a 80. Nel prezzo ci sono lo spazio, l’esterno in base alla stagione, la cucina per cibi freddi e finger food, la pulizia durante la festa, l’impianto audio Bose e le luci della zona dance. La musica dance va fino a mezzanotte; dall’1:30 solo musica soft. Non fanno ristorazione: la torta si porta dalla pasticceria, oppure ci si affida a un catering esterno. La cucina per cibi caldi è un extra da 100 €. I DJ con cui sono in contatto costano da 150 a 300 €; in alternativa ci si collega all’impianto con una playlist. Altri extra: guardaroba 100 €, pagoda 3×3 30 €, stufa esterna 30 €, pulizia extra 50 €, ora extra 100 €. Pulizie finali da 30 a 90 €.",
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
      "Spazio all’aperto, in base alla stagione",
      "Cucina per cibi freddi e finger food",
      "Pulizia durante l’evento",
      "Impianto audio Bose",
      "Luci per la zona dance e il bar",
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
      "Spazio Docks, ai Docks Dora in Via Valprato 68, è in esclusiva fino alle 02:00. Proposta dell’8 agosto 2026 per un 18° a ottobre. L’affitto della location è 500 € e l’addetto alla sicurezza è obbligatorio a 100 €. Il prezzo in scheda somma queste due voci. Apericena, dalle 20:00/20:30: 38 € + IVA 10% a persona, minimo 30, con analcolico libero, 2 drink e sbicchierata. Dopo cena, dalle 21:00/21:30: 28 € + IVA 10% a persona, stesso minimo e stesse bevande. I menù si adattano a intolleranze e allergie. Extra: torta 40 € al chilo oppure portata da voi, DJ con attrezzatura 300 € oppure di vostra competenza, SIAE a vostro carico. Il fotografo è indicato senza un prezzo. Caparra 50% prima dell’evento e saldo a fine servizio. Ingresso pedonale. Contatto BBEvents: info@bbevents.it, 334 8765508.",
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
      "Palazzo Ceriana. Nei file non c’è il prezzo di affitto di questo palazzo: i 2.000 € + IVA 22% sono scritti per il Circolo della Stampa. La cena a buffet è 40 € + IVA 10% a persona, minimo 40: una decina di finger, un primo caldo, dolci al cucchiaio e buvette dei vini (prosecco, spritz, analcolici) aperta per tutta la cena. È obbligatorio 1 addetto alla sicurezza ogni 25/30 invitati, 120 € + IVA 22% ciascuno. Cocktail dopo cena 6 € + IVA 10% a persona. DJ esterno: cachet 200 € + IVA 22%, luci e consolle 150 € + IVA 22%. Diritti SIAE 150 € + IVA 22%, a carico vostro; la location può fare la richiesta.",
    characteristics: ["Palazzo", "Specchi", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "event",
    eventPrice: 0,
    hourlyPrice: 0,
    priceBadge: "Affitto non indicato nei file",
    capacity: 0,
    partyTypes: ["festa"],
    deposit: 0,
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
];
