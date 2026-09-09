import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/payments/online-payments";
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
  reject_proposal: "declined",
  cancel: "cancelled",
  confirm: "confirmed",
  confirm_proposal: "confirmed",
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

  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const action = record ? String(record.action ?? "") : "";
  if (
    ONLINE_PAYMENTS_ENABLED &&
    (action === "confirm" || action === "confirm_proposal")
  ) {
    return NextResponse.json(
      {
        error:
          "La conferma richiede il pagamento online della caparra. Usa /deposit-checkout.",
      },
      { status: 400 },
    );
  }

  const nextStatus = ACTIONS[action];
  if (!nextStatus) {
    return NextResponse.json(
      {
        error:
          "Azione non valida. Usa accept|decline|reject_proposal|cancel|confirm|confirm_proposal.",
      },
      { status: 400 },
    );
  }

  const selectedDate =
    typeof record?.selectedDate === "string"
      ? record.selectedDate.trim()
      : undefined;
  const selectedPriceRaw = record?.selectedPrice;
  const selectedPrice =
    typeof selectedPriceRaw === "number" && Number.isFinite(selectedPriceRaw)
      ? selectedPriceRaw
      : selectedPriceRaw === null
        ? null
        : undefined;

  if (action === "confirm_proposal" && !selectedDate) {
    return NextResponse.json(
      { error: "Seleziona una data proposta." },
      { status: 400 },
    );
  }

  const role = await getProfileRole(user.id);
  const updated = await updateAvailabilityRequestStatus({
    requestId: id,
    nextStatus,
    actorUserId: user.id,
    actorRole: role ?? undefined,
    ...(action === "confirm_proposal"
      ? {
          userSelectedDate: selectedDate,
          userSelectedPrice: selectedPrice ?? null,
        }
      : {}),
  });

  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }

  if (nextStatus !== "confirmed") {
    return NextResponse.json({
      ok: true,
      configured: true,
      request: updated.request,
    });
  }

  const payload = updated.request.eventPayload;
  if (payload.requestKind === "service") {
    return NextResponse.json({
      ok: true,
      configured: true,
      request: updated.request,
    });
  }

  const overrideDate =
    selectedDate ||
    updated.request.userSelectedDate ||
    payload.date;
  const proposed =
    updated.request.managerProposedDates?.find(
      (slot) => slot.date === overrideDate,
    ) ?? null;
  const booking = await createBookingFromRequest({
    request: updated.request,
    organizerId: user.id,
    override: {
      date: overrideDate,
      time: proposed?.time,
      endTime: proposed?.endTime,
      totalCost:
        typeof selectedPrice === "number"
          ? selectedPrice
          : typeof updated.request.userSelectedPrice === "number"
            ? updated.request.userSelectedPrice
            : undefined,
    },
    markDepositPaid: false,
  });

  if (!booking.ok) {
    return NextResponse.json({ error: booking.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    request: updated.request,
    event: booking.event,
  });
}
