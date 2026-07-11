import { NextResponse, type NextRequest } from "next/server";
import { createAppleCalendarEvent } from "@/server/calendar/apple";
import {
  assertValidCalendarRequest,
  checkAvailability,
} from "@/server/calendar/availability";
import { createGoogleCalendarEvent } from "@/server/calendar/google";
import {
  getCalendarConnection,
  saveCalendarReservation,
} from "@/server/calendar/repository";
import type { CreateProviderCalendarEventInput } from "@/server/calendar/types";
import { rateLimit } from "@/server/http/rate-limit";
import {
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "calendar-create-event",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
    if (tooLarge) return tooLarge;

    const input = (await request.json()) as CreateProviderCalendarEventInput;
    try {
      assertValidCalendarRequest(input);
    } catch {
      return NextResponse.json(
        { error: "Evento calendario non valido." },
        { status: 422 },
      );
    }
    if (!input.title?.trim()) {
      return NextResponse.json(
        { error: "Titolo evento calendario mancante." },
        { status: 422 },
      );
    }

    const connection = await getCalendarConnection(input.provider_id);
    const availability = await checkAvailability(
      input.provider_id,
      input.data_inizio,
      input.data_fine,
    );

    if (!availability.available) {
      return NextResponse.json(
        { error: "Il fornitore non e' disponibile in questa fascia.", data: availability },
        { status: 409 },
      );
    }

    const externalEvent =
      connection.calendar_type === "google"
        ? await createGoogleCalendarEvent({
            connection,
            request: input,
          })
        : await createAppleCalendarEvent({
            connection,
            request: input,
          });

    await saveCalendarReservation({
      providerId: input.provider_id,
      calendarType: connection.calendar_type,
      externalEventId: externalEvent.id,
      request: input,
    });

    return NextResponse.json({
      data: {
        calendar_type: connection.calendar_type,
        external_event_id: externalEvent.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile creare evento calendario.",
      },
      { status: 400 },
    );
  }
}
