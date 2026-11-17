import type { ExploreCategory } from "@/types/location";

let queuedExploreCategory: ExploreCategory | null = null;

/** Home cards ask Esplora to open this category on the next paint. */
export function queueExploreCategory(category: ExploreCategory) {
  queuedExploreCategory = category;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vibeup-explore-category"));
  }
}

export function hasQueuedExploreCategory() {
  return queuedExploreCategory != null;
}

export function takeQueuedExploreCategory() {
  const next = queuedExploreCategory;
  queuedExploreCategory = null;
  return next;
}
