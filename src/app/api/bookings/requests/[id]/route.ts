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
  confirm_proposal: "confirmed",
  reject_proposal: "declined",
  cancel: "cancelled",
};

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
  const nextStatus = ACTIONS[action];
  if (!nextStatus) {
    return NextResponse.json(
      {
        error:
          "Azione non valida. Usa accept|decline|confirm|confirm_proposal|reject_proposal|cancel.",
      },
      { status: 400 },
    );
  }

  const selectedDateRaw =
    typeof record?.selectedDate === "string" ? record.selectedDate.trim() : "";
  const selectedPrice = asOptionalNumber(record?.selectedPrice);

  if (action === "confirm_proposal") {
    if (!selectedDateRaw) {
      return NextResponse.json(
        { error: "Seleziona una data proposta." },
        { status: 400 },
      );
    }
  }

  const role = await getProfileRole(user.id);
  const updated = await updateAvailabilityRequestStatus({
    requestId: id,
    nextStatus,
    actorUserId: user.id,
    actorRole: role ?? undefined,
    ...(action === "confirm_proposal"
      ? {
          userSelectedDate: selectedDateRaw,
          userSelectedPrice:
            selectedPrice === undefined ? null : selectedPrice,
        }
      : {}),
  });

  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }

  if (action !== "confirm" && action !== "confirm_proposal") {
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

  let bookingOverride:
    | {
        date?: string;
        time?: string;
        endTime?: string;
        totalCost?: number;
      }
    | undefined;

  if (action === "confirm_proposal") {
    const proposed =
      updated.request.managerProposedDates?.find(
        (slot) => slot.date === selectedDateRaw,
      ) ?? null;
    bookingOverride = {
      date: selectedDateRaw,
      time: proposed?.time,
      endTime: proposed?.endTime,
      totalCost:
        typeof selectedPrice === "number"
          ? selectedPrice
          : typeof updated.request.userSelectedPrice === "number"
            ? updated.request.userSelectedPrice
            : undefined,
    };
  }

  const booking = await createBookingFromRequest({
    request: updated.request,
    organizerId: user.id,
    override: bookingOverride,
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
