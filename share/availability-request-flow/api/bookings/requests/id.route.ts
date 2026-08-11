import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import {
  createBookingFromRequest,
  getProfileRole,
  updateAvailabilityRequestStatus,
} from "@/server/repositories/bookings";
import type { AvailabilityRequestStatus } from "@/types/availability-request";

export const runtime = "nodejs";

const ACTIONS: Record<string, AvailabilityRequestStatus> = {
  accept: "pending_user_confirm",
  decline: "declined",
  confirm: "confirmed",
  cancel: "cancelled",
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-requests-patch",
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const action =
    body && typeof body === "object"
      ? String((body as Record<string, unknown>).action ?? "")
      : "";
  const nextStatus = ACTIONS[action];
  if (!nextStatus) {
    return NextResponse.json(
      { error: "Azione non valida. Usa accept|decline|confirm|cancel." },
      { status: 400 },
    );
  }

  const role = await getProfileRole(user.id);
  const updated = await updateAvailabilityRequestStatus({
    requestId: id,
    nextStatus,
    actorUserId: user.id,
    actorRole: role ?? undefined,
  });

  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }

  if (action !== "confirm") {
    return NextResponse.json({
      ok: true,
      configured: true,
      request: updated.request,
    });
  }

  // Service requests attach to an existing event client-side; no booking row.
  if (updated.request.eventPayload.requestKind === "service") {
    return NextResponse.json({
      ok: true,
      configured: true,
      request: updated.request,
    });
  }

  const booking = await createBookingFromRequest({
    request: updated.request,
    organizerId: user.id,
  });

  if (!booking.ok) {
    return NextResponse.json({ error: booking.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    request: updated.request,
    event: booking.event,
  });
}
