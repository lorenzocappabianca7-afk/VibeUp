import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { revertSiaeCheckout } from "@/server/payments/siae-checkout";
import { getBookingRow } from "@/server/repositories/bookings";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-siae-cancel",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato." },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per continuare." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  }

  const row = await getBookingRow(id);
  if (!row) {
    return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
  }
  if (row.organizer_id !== user.id) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const result = await revertSiaeCheckout({ bookingId: id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event: result.event });
}
