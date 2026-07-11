import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleCalendarOAuthUrl } from "@/server/calendar/google";
import type { CalendarProviderRole } from "@/server/calendar/types";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

const VALID_ROLES = new Set<CalendarProviderRole>([
  "venue_manager",
  "dj",
  "photographer",
  "decorator",
  "catering",
  "security",
  "other_provider",
]);

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "google-calendar-start",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const params = request.nextUrl.searchParams;
    const providerId = params.get("provider_id");
    const providerRole = params.get("provider_role") as CalendarProviderRole | null;
    const providerName = params.get("provider_name");
    const redirectPath = sanitizeRedirectPath(
      params.get("redirect_path") ?? "/?tab=profile",
    );

    if (!providerId || !providerRole || !VALID_ROLES.has(providerRole)) {
      return NextResponse.json(
        { error: "Provider OAuth non valido." },
        { status: 422 },
      );
    }

    const url = buildGoogleCalendarOAuthUrl({
      providerId,
      providerRole,
      providerName: providerName ?? providerId,
      redirectPath,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile avviare OAuth Google.",
      },
      { status: 400 },
    );
  }
}

function sanitizeRedirectPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/?tab=profile";
}
