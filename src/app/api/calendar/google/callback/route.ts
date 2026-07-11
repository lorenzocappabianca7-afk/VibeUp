import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCodeForTokens,
  getGoogleAccountEmail,
  parseGoogleOAuthState,
} from "@/server/calendar/google";
import { saveCalendarConnection } from "@/server/calendar/repository";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "google-calendar-callback",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const params = request.nextUrl.searchParams;
    const code = params.get("code");
    const state = parseGoogleOAuthState(params.get("state"));

    if (!code) {
      return NextResponse.json(
        { error: "Code OAuth Google mancante." },
        { status: 422 },
      );
    }

    const tokens = await exchangeGoogleCodeForTokens(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google non ha restituito refresh token. Riprova con prompt=consent o revoca il consenso precedente.",
      );
    }
    if (!tokens.access_token) {
      throw new Error("Google non ha restituito access token.");
    }

    const email = await getGoogleAccountEmail(tokens.access_token);
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    await saveCalendarConnection({
      providerId: state.providerId,
      providerRole: state.providerRole,
      providerName: state.providerName,
      calendarType: "google",
      accountEmail: email,
      calendarId: "primary",
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token,
      scope: Array.isArray(tokens.scope) ? tokens.scope.join(" ") : tokens.scope ?? "",
      tokenType: tokens.token_type ?? "Bearer",
      expiresAt,
    });

    const redirectPath = sanitizeRedirectPath(state.redirectPath ?? "/?tab=profile");
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set("calendar", "connected");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Callback OAuth Google non riuscita.",
      },
      { status: 400 },
    );
  }
}

function sanitizeRedirectPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/?tab=profile";
}
