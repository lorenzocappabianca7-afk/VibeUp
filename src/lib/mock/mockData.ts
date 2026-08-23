import type {
  ContactPreview,
  DintorniZone,
  ExtraService,
  Location,
  TorinoDistrict,
} from "@/types/location";

type LocationSeed = Omit<Location, "latitude" | "longitude">;

const CONTACT_AVATARS: Record<string, string> = {
  c1: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&q=80",
  c2: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&q=80",
  c3: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&q=80",
  c4: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&q=80",
  c5: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&q=80",
  c6: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&q=80",
  c7: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&q=80",
  c8: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&q=80",
  c9: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&q=80",
  c10: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&h=120&fit=crop&q=80",
};

function contact(
  id: string,
  name: string,
  initials: string,
  avatarColor: string,
): ContactPreview {
  return {
    id,
    name,
    initials,
    avatarColor,
    avatarUrl: CONTACT_AVATARS[id],
  };
}

// ─── Location Torino città ───────────────────────────────────────────────────

const torinoCityLocations: LocationSeed[] = [
  {
    id: "loc-torino-1",
    name: "Palazzo del Centro",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Via Roma 12, 10121 Torino",
    geoArea: "torino_citta",
    district: "centro",
    zoneLabel: "Centro",
    imageUrl:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    ],
    description:
      "Sala elegante nel cuore di Torino, a pochi passi da Piazza Castello. Ideale per compleanni importanti e eventi aziendali con servizio catering interno.",
    characteristics: ["Centro città", "Ambiente elegante", "Cena"],
    technicalDetails: {
      surfaceSqm: 200,
      parkingSpots: 0,
      minHours: 4,
      maxGuests: 60,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: 110,
    capacity: 60,
    partyTypes: ["compleanno", "aziendale", "matrimonio"],
    deposit: 450,
    includedServices: ["Sala climatizzata", "Wi-Fi", "Servizio bar"],
    contactsBeenHere: {
      count: 2,
      contacts: [
        contact("c1", "Giulia R.", "GR", "#32B4B4"),
        contact("c2", "Marco B.", "MB", "#F091B2"),
      ],
    },
  },
  {
    id: "loc-torino-2",
    name: "Loft San Salvario",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Via Madama Cristina 88, 10125 Torino",
    geoArea: "torino_citta",
    district: "san_salvario",
    zoneLabel: "San Salvario",
    imageUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    ],
    description:
      "Loft trendy nel quartiere multiculturale di San Salvario, perfetto per feste giovani e serate con DJ. Vicino al Parco del Valentino.",
    technicalDetails: {
      surfaceSqm: 140,
      parkingSpots: 4,
      minHours: 3,
      maxGuests: 45,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: 85,
    capacity: 45,
    partyTypes: ["compleanno", "festa", "laurea"],
    deposit: 280,
    includedServices: ["Impianto audio", "Luci LED", "Area lounge"],
    contactsBeenHere: {
      count: 1,
      contacts: [
        contact("c3", "Sara M.", "SM", "#32B4B4"),
      ],
    },
  },
  {
    id: "loc-torino-3",
    name: "Terrazza sul Po",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Corso Moncalieri 40, 10131 Torino",
    geoArea: "torino_citta",
    district: "borgo_po",
    zoneLabel: "Borgo Po",
    imageUrl:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    ],
    description:
      "Location panoramica sul fiume Po nel suggestivo Borgo Po. Terrazza esterna e sala interna per aperitivi e feste con vista sulle colline.",
    technicalDetails: {
      surfaceSqm: 180,
      parkingSpots: 10,
      minHours: 3,
      maxGuests: 50,
      accessibility: true,
      airConditioning: false,
      outdoorArea: true,
    },
    hourlyPrice: 130,
    capacity: 50,
    partyTypes: ["compleanno", "matrimonio", "festa"],
    deposit: 500,
    includedServices: ["Terrazza sul Po", "Bar", "Parcheggio riservato"],
    contactsBeenHere: { count: 0, contacts: [] },
  },
  {
    id: "loc-torino-4",
    name: "Fabbrica Aurora Events",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Via Cigna 77, 10152 Torino",
    geoArea: "torino_citta",
    district: "aurora",
    zoneLabel: "Aurora",
    imageUrl:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    ],
    description:
      "Spazio industriale riqualificato nel quartiere Aurora, cuore creativo di Torino. Soffitti alti, acustica ottimizzata e grande flessibilità per allestimenti.",
    technicalDetails: {
      surfaceSqm: 350,
      parkingSpots: 15,
      minHours: 4,
      maxGuests: 100,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: 95,
    capacity: 100,
    partyTypes: ["festa", "aziendale", "compleanno"],
    deposit: 350,
    includedServices: ["Open space", "Impianto audio", "Cucina catering"],
    contactsBeenHere: {
      count: 2,
      contacts: [
        contact("c4", "Luca V.", "LV", "#0F0F11"),
        contact("c5", "Elena P.", "EP", "#F091B2"),
      ],
    },
  },
];

// ─── Location dintorni / prima cintura ───────────────────────────────────────

const dintorniLocations: LocationSeed[] = [
  {
    id: "loc-dintorni-1",
    name: "Cascina Ristrutturata con Piscina",
    city: "Moncalieri",
    comune: "Moncalieri",
    regione: "Piemonte",
    address: "Strada del Drosso 45, 10024 Moncalieri",
    geoArea: "dintorni",
    zone: "moncalieri",
    zoneLabel: "Moncalieri",
    distanceBadge: "A 15 minuti da Torino Centro",
    imageUrl:
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    ],
    description:
      "Perfetta per feste estive, con ampi spazi aperti, dehors ombreggiato, area piscina e zona grigliate attrezzata. Ideale per compleanni all'aperto e feste di paese in stile moderno.",
    characteristics: ["Zona esterna", "Piscina", "Dehors"],
    technicalDetails: {
      surfaceSqm: 600,
      parkingSpots: 35,
      minHours: 5,
      maxGuests: 120,
      accessibility: true,
      airConditioning: false,
      outdoorArea: true,
    },
    hourlyPrice: 120,
    capacity: 120,
    partyTypes: ["compleanno", "festa", "matrimonio"],
    deposit: 550,
    includedServices: ["Piscina", "Dehors", "Zona grigliate", "Parcheggio ampio"],
    contactsBeenHere: {
      count: 3,
      contacts: [
        contact("c6", "Anna T.", "AT", "#32B4B4"),
        contact("c7", "Paolo D.", "PD", "#F091B2"),
      ],
    },
  },
  {
    id: "loc-dintorni-2",
    name: "Villa Reale Eventi",
    city: "Venaria Reale",
    comune: "Venaria Reale",
    regione: "Piemonte",
    address: "Via dell'Architettura 15, 10078 Venaria Reale",
    geoArea: "dintorni",
    zone: "venaria",
    zoneLabel: "Venaria Reale",
    distanceBadge: "A 20 minuti da Torino Centro",
    imageUrl:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    ],
    description:
      "Location di alto livello ed elegante nei pressi della Reggia di Venaria. Sale raffinate e giardino formale, ideale per compleanni importanti, cerimonie e eventi corporate esclusivi.",
    characteristics: ["Ambiente elegante", "Vista", "Zona esterna"],
    technicalDetails: {
      surfaceSqm: 400,
      parkingSpots: 30,
      minHours: 5,
      maxGuests: 90,
      accessibility: true,
      airConditioning: true,
      outdoorArea: true,
    },
    hourlyPrice: 220,
    capacity: 90,
    partyTypes: ["matrimonio", "compleanno", "aziendale"],
    deposit: 900,
    includedServices: [
      "Sale storiche",
      "Giardino all'italiana",
      "Servizio concierge",
    ],
    contactsBeenHere: {
      count: 1,
      contacts: [
        contact("c8", "Chiara L.", "CL", "#32B4B4"),
      ],
    },
  },
  {
    id: "loc-dintorni-3",
    name: "Loft con Giardino e Parcheggio",
    city: "Collegno",
    comune: "Collegno",
    regione: "Piemonte",
    address: "Via Achille Midana 22, 10093 Collegno",
    geoArea: "dintorni",
    zone: "collegno",
    zoneLabel: "Collegno",
    distanceBadge: "Vicino Metro Fermi",
    imageUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    ],
    description:
      "Ex area industriale riqualificata a Collegno. Molto accessibile con la metropolitana, ottimo isolamento acustico per musica ad alto volume. Giardino privato e parcheggio incluso.",
    technicalDetails: {
      surfaceSqm: 220,
      parkingSpots: 20,
      minHours: 3,
      maxGuests: 70,
      accessibility: true,
      airConditioning: true,
      outdoorArea: true,
    },
    hourlyPrice: 90,
    capacity: 70,
    partyTypes: ["festa", "compleanno", "laurea"],
    deposit: 320,
    includedServices: [
      "Isolamento acustico",
      "Giardino privato",
      "Parcheggio",
      "Vicino Metro",
    ],
    contactsBeenHere: { count: 0, contacts: [] },
  },
  {
    id: "loc-dintorni-4",
    name: "Baita / Rustico in Collina",
    city: "Pino Torinese",
    comune: "Pino Torinese",
    regione: "Piemonte",
    address: "Strada Pino Marentino 8, 10025 Pino Torinese",
    geoArea: "dintorni",
    zone: "chieri",
    zoneLabel: "Chieri / Pino Torinese",
    distanceBadge: "A 25 minuti da Torino Centro",
    imageUrl:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
    ],
    description:
      "Immerso nel verde delle colline torinesi, rustico accogliente con camino. Perfetto per feste private intime, compleanni invernali e celebrazioni in un'atmosfera calda e raccolta.",
    technicalDetails: {
      surfaceSqm: 150,
      parkingSpots: 12,
      minHours: 4,
      maxGuests: 40,
      accessibility: false,
      airConditioning: false,
      outdoorArea: true,
    },
    hourlyPrice: 75,
    capacity: 40,
    partyTypes: ["compleanno", "festa", "laurea"],
    deposit: 250,
    includedServices: ["Camino", "Terrazza panoramica", "Cucina rustica"],
    contactsBeenHere: {
      count: 2,
      contacts: [
        contact("c9", "Fabio S.", "FS", "#0F0F11"),
        contact("c10", "Marta G.", "MG", "#F091B2"),
      ],
    },
  },
  {
    id: "loc-dintorni-5",
    name: "Castello delle Feste",
    city: "Rivoli",
    comune: "Rivoli",
    regione: "Piemonte",
    address: "Via Pianezza 180, 10098 Rivoli",
    geoArea: "dintorni",
    zone: "rivoli",
    zoneLabel: "Rivoli",
    distanceBadge: "A 18 minuti da Torino Centro",
    imageUrl:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    ],
    description:
      "Vista panoramica sulla città di Torino, corte interna suggestiva e atmosfera da castello. Location unica per feste memorabili, matrimoni civili e eventi tematici.",
    technicalDetails: {
      surfaceSqm: 280,
      parkingSpots: 25,
      minHours: 4,
      maxGuests: 80,
      accessibility: true,
      airConditioning: true,
      outdoorArea: true,
    },
    hourlyPrice: 180,
    capacity: 80,
    partyTypes: ["matrimonio", "compleanno", "aziendale"],
    deposit: 700,
    includedServices: [
      "Corte interna",
      "Vista panoramica",
      "Sala principale",
      "Parcheggio",
    ],
    contactsBeenHere: { count: 0, contacts: [] },
  },
];

const piemonteRegionalLocations: LocationSeed[] = [
  {
    id: "loc-piemonte-novara",
    name: "Sala delle Arti Novara",
    city: "Novara",
    comune: "Novara",
    regione: "Piemonte",
    address: "Corso della Vittoria 54, 28100 Novara",
    geoArea: "dintorni",
    zoneLabel: "Novara",
    imageUrl:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    ],
    description:
      "Elegante sala eventi nel centro di Novara, ideale per compleanni, cerimonie e ricevimenti aziendali.",
    technicalDetails: {
      surfaceSqm: 220,
      parkingSpots: 12,
      minHours: 4,
      maxGuests: 70,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: 85,
    capacity: 70,
    partyTypes: ["compleanno", "aziendale", "matrimonio"],
    deposit: 350,
    includedServices: ["Sala climatizzata", "Wi-Fi", "Catering partner"],
    contactsBeenHere: { count: 0, contacts: [] },
  },
  {
    id: "loc-piemonte-cuneo",
    name: "Villa delle Langhe",
    city: "Cuneo",
    comune: "Cuneo",
    regione: "Piemonte",
    address: "Via Roma 18, 12100 Cuneo",
    geoArea: "dintorni",
    zoneLabel: "Cuneo",
    imageUrl:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    ],
    description:
      "Villa immersa nel verde delle Langhe, perfetta per feste private e matrimoni con vista sulle colline.",
    technicalDetails: {
      surfaceSqm: 300,
      parkingSpots: 20,
      minHours: 5,
      maxGuests: 80,
      accessibility: true,
      airConditioning: true,
      outdoorArea: true,
    },
    hourlyPrice: 100,
    capacity: 80,
    partyTypes: ["matrimonio", "compleanno", "festa"],
    deposit: 420,
    includedServices: ["Giardino", "Parcheggio", "Cucina attrezzata"],
    contactsBeenHere: { count: 1, contacts: [] },
  },
  {
    id: "loc-piemonte-asti",
    name: "Cantina Eventi Asti",
    city: "Asti",
    comune: "Asti",
    regione: "Piemonte",
    address: "Via Cavour 25, 14100 Asti",
    geoArea: "dintorni",
    zoneLabel: "Asti",
    imageUrl:
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
    ],
    description:
      "Location suggestiva in cantina storica nel Monferrato, ideale per degustazioni, feste e celebrazioni enogastronomiche.",
    technicalDetails: {
      surfaceSqm: 180,
      parkingSpots: 15,
      minHours: 4,
      maxGuests: 55,
      accessibility: true,
      airConditioning: true,
      outdoorArea: true,
    },
    hourlyPrice: 90,
    capacity: 55,
    partyTypes: ["compleanno", "aziendale", "festa"],
    deposit: 380,
    includedServices: ["Degustazione vini", "Terrazza esterna", "Parcheggio"],
    contactsBeenHere: { count: 0, contacts: [] },
  },
  {
    id: "loc-piemonte-alessandria",
    name: "Palazzo del Gavi Events",
    city: "Alessandria",
    comune: "Alessandria",
    regione: "Piemonte",
    address: "Piazza della Libertà 6, 15121 Alessandria",
    geoArea: "dintorni",
    zoneLabel: "Alessandria",
    imageUrl:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    ],
    description:
      "Palazzo storico nel cuore di Alessandria con sale affrescate per eventi eleganti e ricevimenti di prestigio.",
    technicalDetails: {
      surfaceSqm: 250,
      parkingSpots: 10,
      minHours: 4,
      maxGuests: 65,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: 95,
    capacity: 65,
    partyTypes: ["matrimonio", "compleanno", "aziendale"],
    deposit: 400,
    includedServices: ["Sale affrescate", "Wi-Fi", "Servizio bar"],
    contactsBeenHere: { count: 0, contacts: [] },
  },
];

const LOCATION_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "loc-torino-1": { latitude: 45.0703, longitude: 7.6869 },
  "loc-torino-2": { latitude: 45.051, longitude: 7.677 },
  "loc-torino-3": { latitude: 45.065, longitude: 7.698 },
  "loc-torino-4": { latitude: 45.088, longitude: 7.705 },
  "loc-dintorni-1": { latitude: 44.9994, longitude: 7.69 },
  "loc-dintorni-2": { latitude: 45.1267, longitude: 7.6356 },
  "loc-dintorni-3": { latitude: 45.0789, longitude: 7.5776 },
  "loc-dintorni-4": { latitude: 45.04, longitude: 7.75 },
  "loc-dintorni-5": { latitude: 45.07, longitude: 7.52 },
  "loc-piemonte-novara": { latitude: 45.4469, longitude: 8.6218 },
  "loc-piemonte-cuneo": { latitude: 44.3841, longitude: 7.5426 },
  "loc-piemonte-asti": { latitude: 44.9009, longitude: 8.2065 },
  "loc-piemonte-alessandria": { latitude: 44.9133, longitude: 8.6156 },
};

function withCoordinates(locations: LocationSeed[]): Location[] {
  return locations.map((location) => ({
    ...location,
    ...LOCATION_COORDINATES[location.id],
  }));
}

export const MOCK_LOCATIONS: Location[] = withCoordinates([
  ...torinoCityLocations,
  ...dintorniLocations,
  ...piemonteRegionalLocations,
]);

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

// ─── Servizi extra ───────────────────────────────────────────────────────────

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

// ─── Opzioni filtri ──────────────────────────────────────────────────────────

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
