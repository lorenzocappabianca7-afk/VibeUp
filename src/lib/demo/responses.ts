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

function asLocations(value: unknown): DemoChosenLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as DemoChosenLocation;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    return [{ id: row.id, name: row.name }];
  });
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
    bookedLocation: asLocations([payload.bookedLocation])[0] ?? null,
    rating: asRating(payload.rating),
    wouldUseForEighteenth: asBoolean(payload.wouldUseForEighteenth),
    completed: payload.completed === true,
    completedAt: asString(payload.completedAt),
    privacyConsentAt: asString(payload.privacyConsentAt),
    sessionCreatedAt: asString(payload.sessionCreatedAt),
  };
}
