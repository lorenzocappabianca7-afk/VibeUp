import type {
  DecorationFulfillment,
  ExploreCategory,
  MusicType,
  PartyType,
} from "@/types/location";

export type ServiceCategory = Exclude<ExploreCategory, "locali">;

export interface ServiceProvider {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  providerZone: string;
  price: number;
  priceSuffix: string;
  imageUrl?: string;
  galleryImageUrls?: string[];
  musicTypes?: MusicType[];
  partyTypes?: PartyType[];
  supportsInPerson?: boolean;
  fulfillments?: DecorationFulfillment[];
}

export const SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    id: "dj-marco-beat",
    category: "dj",
    name: "Marco Beat",
    description: "DJ commerciale e house per compleanni, lauree e feste private.",
    providerZone: "Torino",
    price: 420,
    priceSuffix: "serata",
    imageUrl:
      "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=80",
    musicTypes: ["commerciale", "house", "anni_90"],
  },
  {
    id: "dj-luna",
    category: "dj",
    name: "DJ Luna",
    description: "Set latino, hip hop e reggaeton con impianto audio incluso.",
    providerZone: "Torino e cintura",
    price: 480,
    priceSuffix: "serata",
    imageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    musicTypes: ["latino", "hip_hop", "commerciale"],
  },
  {
    id: "dj-electro-room",
    category: "dj",
    name: "Electro Room",
    description: "Duo DJ per feste elettroniche, house e dance fino a tarda notte.",
    providerZone: "Piemonte",
    price: 620,
    priceSuffix: "serata",
    imageUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
    musicTypes: ["elettronica", "house"],
  },
  {
    id: "foto-chiara-eventi",
    category: "fotografo",
    name: "Chiara Eventi Photo",
    description: "Reportage naturale per compleanni, feste aziendali e lauree.",
    providerZone: "Torino",
    price: 350,
    priceSuffix: "servizio",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
  },
  {
    id: "foto-studio-rovere",
    category: "fotografo",
    name: "Studio Rovere",
    description: "Foto e mini video recap per eventi serali e party eleganti.",
    providerZone: "Torino e provincia",
    price: 520,
    priceSuffix: "servizio",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
  },
  {
    id: "foto-marta-flash",
    category: "fotografo",
    name: "Marta Flash",
    description: "Scatti candid, photobooth e consegna gallery digitale rapida.",
    providerZone: "Piemonte",
    price: 430,
    priceSuffix: "servizio",
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
  },
  {
    id: "deco-party-lab",
    category: "decorazioni",
    name: "Party Lab Torino",
    description: "Palloncini, backdrop e kit tavolo per compleanni e lauree.",
    providerZone: "San Salvario",
    price: 140,
    priceSuffix: "pacchetto",
    partyTypes: ["compleanno", "laurea", "festa"],
    supportsInPerson: true,
    fulfillments: ["delivery", "pickup"],
  },
  {
    id: "deco-bloom",
    category: "decorazioni",
    name: "Bloom Decorazioni",
    description: "Allestimenti eleganti per matrimoni, eventi aziendali e feste private.",
    providerZone: "Centro Torino",
    price: 260,
    priceSuffix: "allestimento",
    partyTypes: ["matrimonio", "aziendale", "festa"],
    supportsInPerson: true,
    fulfillments: ["delivery"],
  },
  {
    id: "deco-festa-box",
    category: "decorazioni",
    name: "Festa Box",
    description: "Box decorazioni pronte al ritiro con temi personalizzabili.",
    providerZone: "Rivoli",
    price: 95,
    priceSuffix: "box",
    partyTypes: ["compleanno", "laurea", "festa"],
    supportsInPerson: false,
    fulfillments: ["pickup"],
  },
  {
    id: "service-catering-sapori",
    category: "altri",
    name: "Sapori Subalpini Catering",
    description: "Buffet piemontese e internazionale per feste dai 15 invitati.",
    providerZone: "Moncalieri",
    price: 25,
    priceSuffix: "invitato",
  },
  {
    id: "service-audio-luci",
    category: "altri",
    name: "Torino Service Audio-Luci",
    description: "Casse, fari LED e installazione tecnica per la serata.",
    providerZone: "Collegno",
    price: 180,
    priceSuffix: "pacchetto",
  },
  {
    id: "service-buttafuori-safe-night",
    category: "altri",
    name: "Safe Night Security",
    description:
      "Buttafuori certificati per controllo ingressi, gestione code e sicurezza durante feste private.",
    providerZone: "Torino e provincia",
    price: 160,
    priceSuffix: "addetto",
  },
  {
    id: "service-buttafuori-event-guard",
    category: "altri",
    name: "Event Guard Torino",
    description:
      "Staff sicurezza per eventi con presidio accessi, supporto sala e gestione ospiti.",
    providerZone: "Torino",
    price: 300,
    priceSuffix: "serata",
  },
  {
    id: "service-torte",
    category: "altri",
    name: "Pasticceria Aurora",
    description: "Torte personalizzate e sweet table per compleanni e lauree.",
    providerZone: "Torino",
    price: 35,
    priceSuffix: "kg",
  },
];

export function getServiceProviderById(id: string) {
  return SERVICE_PROVIDERS.find((service) => service.id === id);
}
