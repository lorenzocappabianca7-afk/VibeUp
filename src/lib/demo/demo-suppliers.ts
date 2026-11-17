import type { PartyServicePick } from "@/types/party-criteria";

/** Invented demo suppliers. Names are not real businesses. */
export interface DemoSupplier {
  id: string;
  kind: PartyServicePick;
  name: string;
  description: { it: string; en: string };
  price: { it: string; en: string };
}

export const DEMO_SUPPLIERS: DemoSupplier[] = [
  {
    id: "dj-nova",
    kind: "dj",
    name: "Nova Sound",
    description: {
      it: "Set da sera inventato per la demo, con console e luci di scena.",
      en: "A made-up evening set for the demo, with a booth and stage lights.",
    },
    price: { it: "280–420 €", en: "€280–420" },
  },
  {
    id: "dj-lumen",
    kind: "dj",
    name: "Lumen Beat",
    description: {
      it: "Playlist e consolle di fantasia, solo per provare la richiesta.",
      en: "A fictional playlist and booth, only to try the request.",
    },
    price: { it: "220–360 €", en: "€220–360" },
  },
  {
    id: "dj-orbit",
    kind: "dj",
    name: "Orbit Mix",
    description: {
      it: "Un DJ di esempio che nella demo arriva già confermato.",
      en: "A sample DJ who shows up already confirmed in the demo.",
    },
    price: { it: "190–310 €", en: "€190–310" },
  },
  {
    id: "photo-flash",
    kind: "photographer",
    name: "Studio Flash Demo",
    description: {
      it: "Reportage inventato: foto e un breve video della festa.",
      en: "A made-up report: photos and a short video of the party.",
    },
    price: { it: "250–400 €", en: "€250–400" },
  },
  {
    id: "photo-lente",
    kind: "photographer",
    name: "Lente Chiara",
    description: {
      it: "Studio di fantasia per ritratti di gruppo e dettagli della serata.",
      en: "A fictional studio for group portraits and night details.",
    },
    price: { it: "180–320 €", en: "€180–320" },
  },
  {
    id: "photo-pixel",
    kind: "photographer",
    name: "Pixel Party Lab",
    description: {
      it: "Esempio demo di un fotografo che consegna le foto il giorno dopo.",
      en: "A demo sample of a photographer who delivers the next day.",
    },
    price: { it: "210–340 €", en: "€210–340" },
  },
  {
    id: "cake-finto",
    kind: "bakery",
    name: "Dolce Finto",
    description: {
      it: "Pasticceria inventata: torta a piani solo dentro la demo.",
      en: "A made-up bakery: a tiered cake only inside the demo.",
    },
    price: { it: "70–140 €", en: "€70–140" },
  },
  {
    id: "cake-zucchero",
    kind: "bakery",
    name: "Zucchero Demo",
    description: {
      it: "Sweet table di esempio, con dolci che non esistono davvero.",
      en: "A sample sweet table, with cakes that are not real.",
    },
    price: { it: "90–160 €", en: "€90–160" },
  },
  {
    id: "cake-scena",
    kind: "bakery",
    name: "Torta di Scena",
    description: {
      it: "Un nome di fantasia per provare ad aggiungere la torta.",
      en: "A fictional name for trying to add the cake.",
    },
    price: { it: "60–120 €", en: "€60–120" },
  },
  {
    id: "sec-presidio",
    kind: "security",
    name: "Presidio Demo",
    description: {
      it: "Staff di esempio per l'ingresso, senza un'agenzia reale.",
      en: "Sample door staff, not a real agency.",
    },
    price: { it: "150–240 €", en: "€150–240" },
  },
  {
    id: "sec-watch",
    kind: "security",
    name: "Night Watch Sample",
    description: {
      it: "Controllo ingressi inventato per questa prova.",
      en: "A made-up door check for this try-out.",
    },
    price: { it: "130–210 €", en: "€130–210" },
  },
  {
    id: "sec-gate",
    kind: "security",
    name: "Gate Crew Demo",
    description: {
      it: "Squadra di fantasia, etichettata come esempio demo.",
      en: "A fictional crew, labelled as a demo example.",
    },
    price: { it: "160–250 €", en: "€160–250" },
  },
  {
    id: "cat-tavola",
    kind: "catering",
    name: "Tavola Inventata",
    description: {
      it: "Buffet di fantasia, con un menù che esiste solo qui.",
      en: "A fictional buffet, with a menu that exists only here.",
    },
    price: { it: "18–32 € a persona", en: "€18–32 per guest" },
  },
  {
    id: "cat-bite",
    kind: "catering",
    name: "Bite & Glow Demo",
    description: {
      it: "Aperitivo di esempio per vedere come si aggiunge il catering.",
      en: "A sample aperitivo to see how catering is added.",
    },
    price: { it: "15–28 € a persona", en: "€15–28 per guest" },
  },
  {
    id: "cat-menu",
    kind: "catering",
    name: "Menu di Prova",
    description: {
      it: "Cucina inventata: finger food e una torta di scena a parte.",
      en: "A made-up kitchen: finger food, with the cake kept separate.",
    },
    price: { it: "20–35 € a persona", en: "€20–35 per guest" },
  },
  {
    id: "dec-nastro",
    kind: "decorations",
    name: "Nastro Rosa Demo",
    description: {
      it: "Allestimento di fantasia con nastri e un backdrop disegnato.",
      en: "A fictional setup with ribbons and a drawn backdrop.",
    },
    price: { it: "120–220 €", en: "€120–220" },
  },
  {
    id: "dec-carta",
    kind: "decorations",
    name: "Festa di Carta",
    description: {
      it: "Decorazioni di esempio, solo palloncini illustrati.",
      en: "Sample decorations, illustrated balloons only.",
    },
    price: { it: "80–160 €", en: "€80–160" },
  },
  {
    id: "dec-orbit",
    kind: "decorations",
    name: "Balloon Orbit",
    description: {
      it: "Un nome inventato per provare le decorazioni della festa.",
      en: "An invented name for trying the party decorations.",
    },
    price: { it: "90–180 €", en: "€90–180" },
  },
];

export function demoSuppliersFor(kind: PartyServicePick) {
  return DEMO_SUPPLIERS.filter((supplier) => supplier.kind === kind);
}
