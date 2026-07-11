import { NextResponse, type NextRequest } from "next/server";
import {
  assertValidCalendarRequest,
  checkAvailability,
} from "@/server/calendar/availability";
import type { CalendarAvailabilityInput } from "@/server/calendar/types";
import { rateLimit } from "@/server/http/rate-limit";
import {
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "calendar-availability",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
    if (tooLarge) return tooLarge;

    const input = (await request.json()) as CalendarAvailabilityInput;
    try {
      assertValidCalendarRequest(input);
    } catch {
      return NextResponse.json(
        { error: "Richiesta disponibilita' non valida." },
        { status: 422 },
      );
    }

    const availability = await checkAvailability(
      input.provider_id,
      input.data_inizio,
      input.data_fine,
    );

    return NextResponse.json({ data: availability });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile verificare disponibilita'.",
      },
      { status: 400 },
    );
  }
}
