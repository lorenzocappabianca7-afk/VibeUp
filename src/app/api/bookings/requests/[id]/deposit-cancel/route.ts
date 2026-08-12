import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revertDepositPayment } from "@/server/payments/deposit-checkout";
import {
  getAvailabilityRequest,
  rowToAvailabilityRequest,
} from "@/server/repositories/bookings";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const row = await getAvailabilityRequest(id);
  if (!row) {
    return NextResponse.json({ error: "Richiesta non trovata." }, { status: 404 });
  }
  const request = rowToAvailabilityRequest(row);
  if (request.requesterUserId !== user.id) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const result = await revertDepositPayment({
    requestId: id,
    reason: "abandoned",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, request: result.request });
}
