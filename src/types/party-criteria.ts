import {
  clampDrinksPerInvitee,
  DEFAULT_DRINKS_PER_INVITEE,
  type DrinkPackageMode,
} from "@/lib/drinks-quote";
import type { ExtraServiceId } from "@/types/location";

export const MAX_PARTY_DATES = 5;

export const PARTY_EXTRA_SERVICE_OPTIONS: {
  id: ExtraServiceId;
  label: string;
  hint: string;
}[] = [
  { id: "dj", label: "DJ", hint: "Musica e console del locale" },
  { id: "photographer", label: "Fotografo", hint: "Foto e video del locale" },
  { id: "decorations", label: "Decorazioni", hint: "Allestimenti del locale" },
  { id: "catering", label: "Catering", hint: "Buffet e food del locale" },
  { id: "bakery", label: "Torta", hint: "Pasticceria del locale" },
];

const EXTRA_SERVICE_IDS = new Set(
  PARTY_EXTRA_SERVICE_OPTIONS.map((item) => item.id),
);

function isDrinkMode(value: unknown): value is DrinkPackageMode {
  return value === "none" || value === "per_invitee" || value === "open_bar";
}

function normalizeWantedServices(value: unknown): ExtraServiceId[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<ExtraServiceId>();
  for (const item of value) {
    if (typeof item === "string" && EXTRA_SERVICE_IDS.has(item as ExtraServiceId)) {
      unique.add(item as ExtraServiceId);
    }
  }
  return PARTY_EXTRA_SERVICE_OPTIONS.map((item) => item.id).filter((id) =>
    unique.has(id),
  );
}

/** Shown under venue date filters: more options help the manager approve one. */
export const PARTY_DATES_MANAGER_HINT =
  "Più date scegli, più è probabile che il gestore ne approvi una.";

export interface PartyCriteria {
  /** Discrete preferred dates (ISO `YYYY-MM-DD`), max `MAX_PARTY_DATES`. */
  dates: string[];
  /** First selected date — kept for location query fallbacks. */
  dateFrom: string | null;
  /** Last selected date — kept for location query fallbacks. */
  dateTo: string | null;
  guestCount: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  wantedServices: ExtraServiceId[];
  drinkMode: DrinkPackageMode;
  drinksPerInvitee: number;
  freeText: string;
}

export const emptyPartyCriteria: PartyCriteria = {
  dates: [],
  dateFrom: null,
  dateTo: null,
  guestCount: null,
  budgetMin: null,
  budgetMax: null,
  wantedServices: [],
  drinkMode: "none",
  drinksPerInvitee: DEFAULT_DRINKS_PER_INVITEE,
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
  const budgetMin =
    typeof value?.budgetMin === "number" && Number.isFinite(value.budgetMin)
      ? value.budgetMin
      : null;
  const budgetMax =
    typeof value?.budgetMax === "number" && Number.isFinite(value.budgetMax)
      ? value.budgetMax
      : null;

  return {
    ...range,
    guestCount,
    budgetMin,
    budgetMax,
    wantedServices: normalizeWantedServices(value?.wantedServices),
    drinkMode: isDrinkMode(value?.drinkMode) ? value.drinkMode : "none",
    drinksPerInvitee: clampDrinksPerInvitee(
      typeof value?.drinksPerInvitee === "number"
        ? value.drinksPerInvitee
        : DEFAULT_DRINKS_PER_INVITEE,
    ),
    freeText: typeof value?.freeText === "string" ? value.freeText : "",
  };
}

export function partyCriteriaHasHardFilters(criteria: PartyCriteria): boolean {
  return Boolean(
    criteria.guestCount ||
      criteria.budgetMin ||
      criteria.budgetMax ||
      criteria.dates.length > 0 ||
      criteria.dateFrom ||
      criteria.dateTo,
  );
}

export function partyCriteriaHasAny(criteria: PartyCriteria): boolean {
  return (
    partyCriteriaHasHardFilters(criteria) ||
    criteria.freeText.trim().length > 0 ||
    criteria.wantedServices.length > 0 ||
    criteria.drinkMode !== "none"
  );
}

export function partyCriteriaRankingText(criteria: PartyCriteria): string {
  const serviceLabels = PARTY_EXTRA_SERVICE_OPTIONS.filter((item) =>
    criteria.wantedServices.includes(item.id),
  ).map((item) => `${item.label} ${item.hint}`);
  return [criteria.freeText, ...serviceLabels].filter(Boolean).join(" ");
}
