import { NextResponse, type NextRequest } from "next/server";
import { saveCalendarConnection } from "@/server/calendar/repository";
import type { CalendarProviderRole } from "@/server/calendar/types";
import { rateLimit } from "@/server/http/rate-limit";
import {
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";

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

interface AppleConnectRequest {
  provider_id: string;
  provider_role: CalendarProviderRole;
  provider_name: string;
  icloud_email: string;
  app_specific_password: string;
  calendar_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "apple-calendar-connect",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
    if (tooLarge) return tooLarge;

    const input = (await request.json()) as AppleConnectRequest;
    if (
      !input.provider_id ||
      !input.provider_role ||
      !VALID_ROLES.has(input.provider_role) ||
      !input.icloud_email?.trim() ||
      !input.app_specific_password?.trim()
    ) {
      return NextResponse.json(
        { error: "Credenziali Apple Calendar non valide." },
        { status: 422 },
      );
    }

    const connection = await saveCalendarConnection({
      providerId: input.provider_id,
      providerRole: input.provider_role,
      providerName: input.provider_name || input.provider_id,
      calendarType: "apple",
      accountEmail: input.icloud_email.trim(),
      calendarId: input.calendar_id ?? "primary",
      appleAppPassword: input.app_specific_password.trim(),
      scope: "caldav",
      tokenType: "Basic",
      expiresAt: null,
    });

    return NextResponse.json({
      data: {
        provider_id: connection.provider_id,
        calendar_type: connection.calendar_type,
        account_email: connection.account_email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile collegare Apple Calendar.",
      },
      { status: 400 },
    );
  }
}
