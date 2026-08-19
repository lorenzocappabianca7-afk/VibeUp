export const MAX_PARTY_DATES = 5;

export interface PartyCriteria {
  /** Discrete preferred dates (ISO `YYYY-MM-DD`), max `MAX_PARTY_DATES`. */
  dates: string[];
  /** First selected date — kept for location query fallbacks. */
  dateFrom: string | null;
  /** Last selected date — kept for location query fallbacks. */
  dateTo: string | null;
  guestCount: number | null;
  budgetMax: number | null;
  freeText: string;
}

export const emptyPartyCriteria: PartyCriteria = {
  dates: [],
  dateFrom: null,
  dateTo: null,
  guestCount: null,
  budgetMax: null,
  freeText: "",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePartyDates(dates: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const value of dates) {
    const trimmed = value.trim();
    if (!ISO_DATE.test(trimmed)) continue;
    unique.add(trimmed);
  }
  return [...unique].sort().slice(0, MAX_PARTY_DATES);
}

export function syncPartyDateRange(dates: readonly string[]): {
  dates: string[];
  dateFrom: string | null;
  dateTo: string | null;
} {
  const next = normalizePartyDates(dates);
  return {
    dates: next,
    dateFrom: next[0] ?? null,
    dateTo: next[next.length - 1] ?? null,
  };
}

export function normalizePartyCriteria(
  value: Partial<PartyCriteria> | null | undefined,
): PartyCriteria {
  const dates = normalizePartyDates(
    value?.dates?.length
      ? value.dates
      : [value?.dateFrom, value?.dateTo].filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        ),
  );
  const range = syncPartyDateRange(dates);
  const guestCount =
    typeof value?.guestCount === "number" && Number.isFinite(value.guestCount)
      ? value.guestCount
      : null;
  const budgetMax =
    typeof value?.budgetMax === "number" && Number.isFinite(value.budgetMax)
      ? value.budgetMax
      : null;

  return {
    ...range,
    guestCount,
    budgetMax,
    freeText: typeof value?.freeText === "string" ? value.freeText : "",
  };
}

export function partyCriteriaHasHardFilters(criteria: PartyCriteria): boolean {
  return Boolean(
    criteria.guestCount ||
      criteria.budgetMax ||
      criteria.dates.length > 0 ||
      criteria.dateFrom ||
      criteria.dateTo,
  );
}

export function partyCriteriaHasAny(criteria: PartyCriteria): boolean {
  return (
    partyCriteriaHasHardFilters(criteria) || criteria.freeText.trim().length > 0
  );
}
