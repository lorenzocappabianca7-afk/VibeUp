const PRICE_DETAIL = /€|\beuro\b|\biva\b/i;

/**
 * Public location copy: at most three sentences about the space.
 * Price, VAT and listino details stay in the pricing fields.
 */
export function venueAtmosphereDescription(
  text: string,
  fallback = "Location per feste private.",
): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !PRICE_DETAIL.test(sentence))
    .slice(0, 3)
    .join(" ");

  return cleaned || fallback;
}
