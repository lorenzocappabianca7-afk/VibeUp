import { NextResponse, type NextRequest } from "next/server";
import { deleteCatalogListing } from "@/server/repositories/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "catalog-listings-delete",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  }

  const result = await deleteCatalogListing(id.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
