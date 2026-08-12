import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { processConfirmationDeadlines } from "@/server/repositories/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron (or manual) endpoint:
 * GET/POST /api/cron/expire-availability-requests
 * Auth: Authorization: Bearer $CRON_SECRET
 */
function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) {
    // Allow in local/dev without secret so scripts can hit the route.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization")?.trim() || "";
  return header === `Bearer ${secret}`;
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato.", configured: false },
      { status: 503 },
    );
  }

  const result = await processConfirmationDeadlines();
  return NextResponse.json({
    ok: true,
    configured: true,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
