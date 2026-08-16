import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  buildConfirmedEventWhatsAppMessage,
  buildWaMeUrl,
} from "@/lib/whatsapp";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { getManagerContactForOrganizerEvent } from "@/server/bookings/manager-contact";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "event-manager-contact",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato.", configured: false },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Accedi per continuare.", configured: true },
      { status: 401 },
    );
  }

  const { id: eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: "ID evento mancante." }, { status: 400 });
  }

  const locationId =
    request.nextUrl.searchParams.get("locationId")?.trim() || null;
  const eventTitle =
    request.nextUrl.searchParams.get("title")?.trim() || "il mio evento";
  const eventDate =
    request.nextUrl.searchParams.get("date")?.trim() || "";
  const locationNameParam =
    request.nextUrl.searchParams.get("locationName")?.trim() || "";

  const contact = await getManagerContactForOrganizerEvent({
    organizerId: user.id,
    eventId,
    locationId,
  });

  const userName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] ||
    "organizzatore";

  const locationName =
    contact.locationName || locationNameParam || "la location";
  const dateLabel = eventDate ? formatDate(eventDate) : eventDate || "—";

  let waMeUrl: string | null = null;
  if (contact.confirmed && contact.whatsappNumber) {
    const message = buildConfirmedEventWhatsAppMessage({
      userName,
      eventTitle,
      eventDateLabel: dateLabel,
      locationName,
    });
    waMeUrl = buildWaMeUrl(contact.whatsappNumber, message);
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    confirmed: contact.confirmed,
    hasWhatsApp: Boolean(waMeUrl),
    waMeUrl,
  });
}
