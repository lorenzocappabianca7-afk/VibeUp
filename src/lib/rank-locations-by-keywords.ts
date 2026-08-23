import { expandSearchTerms, foldItalian } from "@/lib/location-characteristics";

const STOPWORDS_IT = new Set([
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "uno",
  "una",
  "di",
  "a",
  "da",
  "in",
  "con",
  "su",
  "per",
  "tra",
  "fra",
  "e",
  "o",
  "che",
  "vorrei",
  "voglio",
  "tipo",
  "mia",
  "mio",
  "mie",
  "miei",
  "festa",
  "party",
  "evento",
  "organizzare",
  "organizza",
  "avere",
  "fare",
  "sono",
  "del",
  "della",
  "dei",
  "delle",
  "degli",
]);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS_IT.has(w));
}

export type RankableLocation = {
  name?: string;
  description?: string;
  city?: string;
  zoneLabel?: string;
  district?: string;
  partyTypes?: string[];
  includedServices?: string[];
  characteristics?: string[];
  tags?: string[];
  technicalDetails?: { outdoorArea?: boolean };
};

function locationHaystack(loc: RankableLocation): string {
  const implicit: string[] = [];
  if (loc.technicalDetails?.outdoorArea) {
    implicit.push("zona esterna", "esterna", "dehors", "giardino");
  }
  if (loc.district === "centro") {
    implicit.push("centro citta", "centro");
  }

  return foldItalian(
    [
      loc.name,
      loc.description,
      loc.city,
      loc.zoneLabel,
      loc.district,
      ...(loc.partyTypes ?? []),
      ...(loc.includedServices ?? []),
      ...(loc.characteristics ?? []),
      ...(loc.tags ?? []),
      ...implicit,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function characteristicHaystack(loc: RankableLocation): string {
  return foldItalian((loc.characteristics ?? []).join(" "));
}

/**
 * Rank locations by free-text keyword affinity.
 * Matching a venue's 3 key characteristics boosts the score the most.
 * Never excludes items — score 0 stays at the bottom.
 */
export function rankLocationsByKeywords<T extends RankableLocation>(
  locations: T[],
  freeText: string,
): T[] {
  if (!freeText.trim()) return locations;

  const keywords = extractKeywords(freeText);
  if (keywords.length === 0) return locations;
  const terms = expandSearchTerms(keywords);

  const scored = locations.map((loc, index) => {
    const haystack = locationHaystack(loc);
    const traits = characteristicHaystack(loc);
    const score = terms.reduce((acc, term) => {
      if (!term) return acc;
      if (traits.includes(term)) return acc + 4;
      if (haystack.includes(term)) return acc + 1;
      return acc;
    }, 0);
    return { loc, score, index };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.loc);
}

/** Rough total cost estimate for hard budget filtering. */
export function estimateLocationTotalCost(
  location: {
    hourlyPrice: number;
    eventPrice?: number;
    personPrice?: number;
    priceModel?: "event" | "person";
  },
  guestCount: number,
): number {
  if (location.priceModel === "event" && typeof location.eventPrice === "number") {
    return location.eventPrice;
  }
  if (
    (location.priceModel === "person" || typeof location.personPrice === "number") &&
    typeof location.personPrice === "number"
  ) {
    return location.personPrice * Math.max(1, guestCount);
  }
  // ~3h typical booking window for hourly venues
  return location.hourlyPrice * 3;
}
