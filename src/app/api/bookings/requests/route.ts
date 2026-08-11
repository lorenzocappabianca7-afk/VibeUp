import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import {
  createAvailabilityRequest,
  getProfileRole,
  listAvailabilityRequestsForUser,
  listOwnedLocationIds,
} from "@/server/repositories/bookings";
import type { AvailabilityEventPayload } from "@/types/availability-request";

export const runtime = "nodejs";

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Supabase non configurato.", configured: false },
        { status: 503 },
      ),
    };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Accedi per continuare.", configured: true },
        { status: 401 },
      ),
    };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "bookings-requests-get",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  const role = await getProfileRole(auth.user!.id);
  const ownedLocationIds = await listOwnedLocationIds(auth.user!.id);
  const requests = await listAvailabilityRequestsForUser({
    userId: auth.user!.id,
    role: role ?? undefined,
    ownedLocationIds,
  });

  return NextResponse.json({
    ok: true,
    configured: true,
    requests,
    count: requests.length,
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "bookings-requests-post",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 256 * 1024);
  if (tooLarge) return tooLarge;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const locationId =
    typeof payload.locationId === "string" ? payload.locationId.trim() : "";
  const locationName =
    typeof payload.locationName === "string" ? payload.locationName.trim() : "";
  const eventPayload = payload.eventPayload as AvailabilityEventPayload | undefined;

  if (!locationId || !locationName || !eventPayload || typeof eventPayload !== "object") {
    return NextResponse.json(
      { error: "Payload richiesta non valido." },
      { status: 400 },
    );
  }

  const displayName =
    (typeof auth.user!.user_metadata?.display_name === "string" &&
      auth.user!.user_metadata.display_name) ||
    auth.user!.email ||
    "Utente";

  const result = await createAvailabilityRequest({
    requesterId: auth.user!.id,
    requesterName: displayName,
    requesterEmail: auth.user!.email ?? undefined,
    locationId,
    locationName,
    eventPayload,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Notification is attempted inside createAvailabilityRequest (best-effort).
  // Always return ok:true when the row was saved.
  return NextResponse.json({
    ok: true,
    configured: true,
    request: result.request,
  });
}
