import { NextResponse, type NextRequest } from "next/server";
import {
  listPublishedCatalogLocations,
  upsertCatalogLocation,
} from "@/server/repositories/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import type { Location } from "@/types/location";
import type { ManagedListingStatus } from "@/types/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "catalog-listings-get",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        locations: [],
        configured: false,
        message: "Supabase non configurato.",
      },
      { status: 200 },
    );
  }

  const locations = await listPublishedCatalogLocations();

  return NextResponse.json(
    {
      locations,
      configured: true,
      count: locations.length,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "catalog-listings-post",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  /* Location payloads may still include data-URL photos until Storage sprint. */
  const tooLarge = rejectLargeRequest(request, 8 * 1024 * 1024);
  if (tooLarge) return tooLarge;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const location = payload.location as Location | undefined;
  const status = payload.status as ManagedListingStatus | undefined;

  if (!location || typeof location !== "object" || !location.id || !location.name) {
    return NextResponse.json(
      { error: "Location non valida." },
      { status: 400 },
    );
  }

  if (
    status !== "draft" &&
    status !== "pending_review" &&
    status !== "published"
  ) {
    return NextResponse.json({ error: "Status non valido." }, { status: 400 });
  }

  let ownerId: string | null = null;
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    ownerId = user?.id ?? null;
  } catch {
    ownerId = null;
  }

  const result = await upsertCatalogLocation({ location, status, ownerId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
