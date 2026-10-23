import { searchTurinSchools } from "@/content/schools";
import { guardLaunchRequest, launchOk } from "@/server/launch/request";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-schools", 60, 60_000);
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get("q") ?? "";
  return launchOk({ suggestions: searchTurinSchools(query) });
}
