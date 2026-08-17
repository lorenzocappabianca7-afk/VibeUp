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
  partyTypes?: string[];
  includedServices?: string[];
  tags?: string[];
};

function locationHaystack(loc: RankableLocation): string {
  return [
    loc.name,
    loc.description,
    loc.city,
    loc.zoneLabel,
    ...(loc.partyTypes ?? []),
    ...(loc.includedServices ?? []),
    ...(loc.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Rank locations by free-text keyword affinity.
 * Never excludes items — score 0 stays at the bottom.
 */
export function rankLocationsByKeywords<T extends RankableLocation>(
  locations: T[],
  freeText: string,
): T[] {
  if (!freeText.trim()) return locations;

  const keywords = extractKeywords(freeText);
  if (keywords.length === 0) return locations;

  const scored = locations.map((loc, index) => {
    const haystack = locationHaystack(loc);
    const score = keywords.reduce(
      (acc, kw) => acc + (haystack.includes(kw) ? 1 : 0),
      0,
    );
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
