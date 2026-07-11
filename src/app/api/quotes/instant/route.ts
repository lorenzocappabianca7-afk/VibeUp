import { NextResponse, type NextRequest } from "next/server";
import { generateInstantQuote } from "@/server/services/quote-estimation";
import { rateLimit } from "@/server/http/rate-limit";
import {
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";
import type { InstantQuotePreferences } from "@/server/services/smart-location-types";

export const runtime = "nodejs";

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidInstantQuotePreferences(
  value: unknown,
): value is InstantQuotePreferences {
  if (!value || typeof value !== "object") return false;

  const preferences = value as Partial<InstantQuotePreferences>;
  const guestCount = Number(preferences.guestCount);
  const cakeKg =
    preferences.cakeKg === undefined ? undefined : Number(preferences.cakeKg);

  return (
    Number.isFinite(guestCount) &&
    guestCount >= 1 &&
    guestCount <= 1000 &&
    isValidTime(preferences.startTime) &&
    isValidTime(preferences.endTime) &&
    (cakeKg === undefined || (Number.isFinite(cakeKg) && cakeKg > 0))
  );
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "instant-quote",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
    if (tooLarge) return tooLarge;

    const body = await request.json();
    if (!isValidInstantQuotePreferences(body)) {
      return NextResponse.json(
        { error: "Preferenze preventivo non valide." },
        { status: 422 },
      );
    }

    const result = await generateInstantQuote(body);

    return NextResponse.json(
      { data: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate instant quote",
      },
      { status: 400 },
    );
  }
}
