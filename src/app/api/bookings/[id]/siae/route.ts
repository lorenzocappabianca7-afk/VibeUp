import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { parseSiaeChoice } from "@/lib/siae";
import { getBookingRow, updateBookingSiae } from "@/server/repositories/bookings";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-siae-choice",
    limit: 30,
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const choice = parseSiaeChoice(body.choice);
  if (choice !== "diy" && choice !== "venue") {
    return NextResponse.json(
      { error: "Scegli “fai da te” o “richiedilo al locale”." },
      { status: 400 },
    );
  }

  const row = await getBookingRow(id);
  if (!row) {
    return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  }
  if (row.siae_status === "managed") {
    return NextResponse.json(
      { error: "Il documento SIAE è già in gestione da VibeUp." },
      { status: 409 },
    );
  }

  const result = await updateBookingSiae({
    bookingId: id,
    organizerId: user.id,
    patch: {
      siae_choice: choice,
      siae_status: choice,
      siae_stripe_checkout_session_id: null,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    event: result.event,
  });
}
