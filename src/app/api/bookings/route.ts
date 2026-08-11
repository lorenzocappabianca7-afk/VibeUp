import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { listBookingsForOrganizer } from "@/server/repositories/bookings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "bookings-list-get",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { events: [], configured: false },
      { status: 200 },
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

  const events = await listBookingsForOrganizer(user.id);
  return NextResponse.json({
    ok: true,
    configured: true,
    events,
    count: events.length,
  });
}
