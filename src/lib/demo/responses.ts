import type {
  DemoChosenLocation,
  DemoResponseRow,
  DemoSubmission,
} from "@/types/demo";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asRating(value: unknown): number | null {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

function asLocation(value: unknown): DemoChosenLocation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as DemoChosenLocation;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const id = row.id.trim();
  const name = row.name.trim();
  if (!id || !name) return null;
  return { id, name };
}

function asLocations(value: unknown): DemoChosenLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = asLocation(item);
    return parsed ? [parsed] : [];
  });
}

/** Location saved for this visit. Older rows keep the booked pick, then the list. */
export function demoChosenLocation(row: DemoResponseRow): DemoChosenLocation | null {
  if (row.chosenLocation) return row.chosenLocation;
  if (row.selectedLocations.length === 1) return row.selectedLocations[0];
  return row.bookedLocation;
}

export function parseDemoResponse(submission: DemoSubmission): DemoResponseRow {
  const payload = submission.payload;
  return {
    id: submission.id,
    createdAt: submission.createdAt,
    firstName: asString(payload.firstName) ?? "",
    lastName: asString(payload.lastName) ?? "",
    email: asString(payload.email) ?? "",
    phone: asString(payload.phone) ?? "",
    selectedLocations: asLocations(payload.selectedLocations),
    chosenLocation: asLocation(payload.chosenLocation),
    bookedLocation: asLocation(payload.bookedLocation),
    rating: asRating(payload.rating),
    wouldUseForEighteenth: asBoolean(payload.wouldUseForEighteenth),
    completed: payload.completed === true,
    completedAt: asString(payload.completedAt),
    privacyConsentAt: asString(payload.privacyConsentAt),
    sessionCreatedAt: asString(payload.sessionCreatedAt),
  };
}
