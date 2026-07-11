import { NextResponse } from "next/server";
import { listSmartLocations } from "@/server/repositories/locations";

export const runtime = "nodejs";

export async function GET() {
  const records = await listSmartLocations();

  return NextResponse.json(
    { data: records },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
