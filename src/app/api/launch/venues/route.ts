import { searchVenueNames } from "@/server/repositories/waitlist";
import { guardLaunchRequest, launchError, launchOk } from "@/server/launch/request";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-venues", 60, 60_000);
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const suggestions = await searchVenueNames(query);
    return launchOk({ suggestions });
  } catch {
    return launchError(500, "unavailable");
  }
}
