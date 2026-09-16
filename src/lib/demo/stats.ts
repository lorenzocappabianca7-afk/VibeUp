import type { DemoResponseRow } from "@/types/demo";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DemoLocationRank {
  id: string;
  name: string;
  count: number;
}

export interface DemoStats {
  started: number;
  completed: number;
  completionRate: number | null;
  averageRating: number | null;
  ratedCount: number;
  eighteenthYes: number;
  eighteenthNo: number;
  eighteenthAnswered: number;
  eighteenthYesRate: number | null;
  eighteenthNoRate: number | null;
  locationRanking: DemoLocationRank[];
}

/** Timestamp used for sorting and date-range filters: form entry, then row insert. */
export function demoEntryTimestamp(row: DemoResponseRow): string {
  return row.sessionCreatedAt ?? row.createdAt;
}

function dayBound(ymd: string, endOfDay: boolean): number | null {
  if (!DAY_RE.test(ymd)) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).getTime();
}

export function filterDemoRowsByDateRange(
  rows: DemoResponseRow[],
  from: string,
  to: string,
): DemoResponseRow[] {
  const start = from.trim() ? dayBound(from.trim(), false) : null;
  const end = to.trim() ? dayBound(to.trim(), true) : null;
  if (start == null && end == null) return rows;

  return rows.filter((row) => {
    const time = new Date(demoEntryTimestamp(row)).getTime();
    if (!Number.isFinite(time)) return false;
    if (start != null && time < start) return false;
    if (end != null && time > end) return false;
    return true;
  });
}

function rate(part: number, total: number): number | null {
  if (total <= 0) return null;
  return part / total;
}

/** Finished through the 1–5 rating step. */
function reachedRating(row: DemoResponseRow): boolean {
  return row.rating != null;
}

export function computeDemoStats(rows: DemoResponseRow[]): DemoStats {
  const started = rows.length;
  const completedRows = rows.filter(reachedRating);
  const completed = completedRows.length;
  const ratedCount = completedRows.length;
  const ratingSum = completedRows.reduce(
    (sum, row) => sum + (row.rating ?? 0),
    0,
  );

  const eighteenthYes = rows.filter(
    (row) => row.wouldUseForEighteenth === true,
  ).length;
  const eighteenthNo = rows.filter(
    (row) => row.wouldUseForEighteenth === false,
  ).length;
  const eighteenthAnswered = eighteenthYes + eighteenthNo;

  const locationCounts = new Map<string, DemoLocationRank>();
  for (const row of rows) {
    for (const location of row.selectedLocations) {
      const key = location.id || location.name;
      const current = locationCounts.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      locationCounts.set(key, {
        id: location.id,
        name: location.name,
        count: 1,
      });
    }
  }

  const locationRanking = [...locationCounts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "it");
  });

  return {
    started,
    completed,
    completionRate: rate(completed, started),
    averageRating: ratedCount > 0 ? ratingSum / ratedCount : null,
    ratedCount,
    eighteenthYes,
    eighteenthNo,
    eighteenthAnswered,
    eighteenthYesRate: rate(eighteenthYes, eighteenthAnswered),
    eighteenthNoRate: rate(eighteenthNo, eighteenthAnswered),
    locationRanking,
  };
}

export function formatDemoPercent(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "percent",
    maximumFractionDigits: value > 0 && value < 0.01 ? 1 : 0,
  }).format(value);
}

export function formatDemoAverage(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
