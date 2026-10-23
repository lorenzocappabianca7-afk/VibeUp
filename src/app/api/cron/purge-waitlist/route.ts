import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { purgeWaitlistRetention } from "@/server/repositories/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron (or manual) endpoint:
 * GET/POST /api/cron/purge-waitlist
 * Auth: Authorization: Bearer $CRON_SECRET
 * Deletes expired email codes and unverified signups older than 7 days.
 */
function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) {
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

  let result: Awaited<ReturnType<typeof purgeWaitlistRetention>>;
  try {
    result = await purgeWaitlistRetention();
  } catch (error) {
    console.error("[purge-waitlist]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Pulizia non disponibile." }, { status: 503 });
  }
  if (!result) {
    return NextResponse.json(
      { error: "Supabase non configurato.", configured: false },
      { status: 503 },
    );
  }
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
