import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { respondToAvailabilityRequestByToken } from "@/server/repositories/bookings";
import type { ManagerProposedDate } from "@/types/availability-request";

export const runtime = "nodejs";

function parseProposedDates(value: unknown): ManagerProposedDate[] {
  if (!Array.isArray(value)) return [];
  const dates: ManagerProposedDate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const date = typeof raw.date === "string" ? raw.date.trim() : "";
    if (!date) continue;
    dates.push({
      date,
      time: typeof raw.time === "string" ? raw.time.trim() || undefined : undefined,
      endTime:
        typeof raw.endTime === "string" ? raw.endTime.trim() || undefined : undefined,
      note: typeof raw.note === "string" ? raw.note.trim() || undefined : undefined,
    });
  }
  return dates;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-requests-respond",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 64 * 1024);
  if (tooLarge) return tooLarge;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato.", configured: false },
      { status: 503 },
    );
  }

  const { token: rawToken } = await context.params;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Token mancante." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = String(payload.action ?? "");
  if (action !== "accept" && action !== "decline" && action !== "propose") {
    return NextResponse.json(
      { error: "Azione non valida. Usa accept|decline|propose." },
      { status: 400 },
    );
  }

  const managerNote =
    typeof payload.managerNote === "string" ? payload.managerNote : null;
  const proposedDates = parseProposedDates(payload.proposedDates);
  let proposedPrice: number | null = null;
  if (typeof payload.proposedPrice === "number" && Number.isFinite(payload.proposedPrice)) {
    proposedPrice = payload.proposedPrice;
  } else if (
    typeof payload.proposedPrice === "string" &&
    payload.proposedPrice.trim() !== ""
  ) {
    const parsed = Number(payload.proposedPrice);
    if (Number.isFinite(parsed)) proposedPrice = parsed;
  }

  const result = await respondToAvailabilityRequestByToken({
    token,
    action,
    managerNote,
    proposedDates: action === "propose" ? proposedDates : null,
    proposedPrice: action === "propose" ? proposedPrice : null,
  });

  if (!result.ok) {
    const status =
      result.error.includes("scaduto") ||
      result.error.includes("utilizzato") ||
      result.error.includes("già ricevuto") ||
      result.error.includes("non valido")
        ? 410
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    request: result.request,
  });
}
