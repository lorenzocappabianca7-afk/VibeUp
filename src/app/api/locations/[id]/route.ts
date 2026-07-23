import { NextResponse, type NextRequest } from "next/server";
import { getSmartLocationById } from "@/server/repositories/locations";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    scope: "locations-detail",
    limit: 180,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 120 || /[^\w.-]/.test(id)) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const record = await getSmartLocationById(id);

  if (!record) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(
    { data: record },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
