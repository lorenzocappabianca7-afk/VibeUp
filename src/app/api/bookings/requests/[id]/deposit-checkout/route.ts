import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { startDepositCheckout } from "@/server/payments/deposit-checkout";

export const runtime = "nodejs";

function asOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-deposit-checkout",
    limit: 20,
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

  const selectedDate =
    typeof body.selectedDate === "string" ? body.selectedDate.trim() : undefined;
  const selectedPrice = asOptionalNumber(body.selectedPrice);

  const result = await startDepositCheckout({
    requestId: id,
    organizerId: user.id,
    organizerEmail: user.email,
    selectedDate,
    selectedPrice: selectedPrice === undefined ? null : selectedPrice,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if ("alreadyPaid" in result && result.alreadyPaid) {
    return NextResponse.json({
      ok: true,
      configured: true,
      alreadyPaid: true,
      request: result.request,
      event: result.event,
    });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    checkoutUrl: result.checkoutUrl,
    sessionId: result.sessionId,
    request: result.request,
  });
}
