import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import {
  adminReviewAvailabilityRequest,
  getProfileRole,
} from "@/server/repositories/bookings";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "bookings-admin-review",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 32 * 1024);
  if (tooLarge) return tooLarge;

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

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = String(payload.action ?? "");
  if (action !== "forward" && action !== "discard") {
    return NextResponse.json(
      { error: "Azione non valida. Usa forward|discard." },
      { status: 400 },
    );
  }

  const adminNote =
    typeof payload.adminNote === "string" ? payload.adminNote : null;

  const role = await getProfileRole(user.id);
  const result = await adminReviewAvailabilityRequest({
    requestId: id,
    action,
    adminUserId: user.id,
    adminRole: role,
    adminEmail: user.email ?? null,
    adminNote,
  });

  if (!result.ok) {
    const status = result.error.includes("Solo gli admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    request: result.request,
  });
}
