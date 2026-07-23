import { NextResponse, type NextRequest } from "next/server";
import { listSmartLocations } from "@/server/repositories/locations";
import { rateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "locations-list",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const records = await listSmartLocations();

  return NextResponse.json(
    { data: records },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
