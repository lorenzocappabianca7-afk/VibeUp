export interface PartyCriteria {
  dateFrom: string | null;
  dateTo: string | null;
  guestCount: number | null;
  budgetMax: number | null;
  freeText: string;
}

export const emptyPartyCriteria: PartyCriteria = {
  dateFrom: null,
  dateTo: null,
  guestCount: null,
  budgetMax: null,
  freeText: "",
};

export function partyCriteriaHasHardFilters(criteria: PartyCriteria): boolean {
  return Boolean(
    criteria.guestCount ||
      criteria.budgetMax ||
      criteria.dateFrom ||
      criteria.dateTo,
  );
}
