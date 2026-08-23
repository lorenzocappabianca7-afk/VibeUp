/** Up to 3 key venue traits used to rank Explore results from free text. */

export const LOCATION_CHARACTERISTIC_SUGGESTIONS = [
  "Cena",
  "Zona esterna",
  "Vista",
  "Ambiente elegante",
  "Centro città",
  "Collina",
  "Piscina",
  "Dehors",
  "Parcheggio",
  "Musica fino a tardi",
] as const;

export const MAX_LOCATION_CHARACTERISTICS = 3;

const SYNONYM_GROUPS: string[][] = [
  ["cena", "menu", "catering", "buffet", "pranzo", "ristorante"],
  ["zona esterna", "esterna", "esterno", "dehors", "giardino", "outdoor", "aperto"],
  ["vista", "panorama", "panoramica"],
  ["ambiente elegante", "elegante", "eleganza", "raffinato", "luxury"],
  ["centro citta", "centro", "citta", "centrale"],
  ["collina", "collinare", "langhe", "colline"],
  ["piscina", "pool"],
  ["parcheggio", "parking", "auto"],
  ["musica fino a tardi", "musica", "dj", "notte", "sera"],
];

export function normalizeCharacteristic(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCharacteristics(
  values: readonly string[] | undefined | null,
): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values ?? []) {
    const value = normalizeCharacteristic(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
    if (next.length >= MAX_LOCATION_CHARACTERISTICS) break;
  }
  return next;
}

export function foldItalian(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function expandSearchTerms(keywords: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const keyword of keywords) {
    const folded = foldItalian(keyword);
    if (!folded) continue;
    expanded.add(folded);
    for (const group of SYNONYM_GROUPS) {
      if (group.some((item) => item.includes(folded) || folded.includes(item))) {
        for (const item of group) expanded.add(item);
      }
    }
  }
  return [...expanded];
}