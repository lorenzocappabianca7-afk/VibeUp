import { USERNAME_RE } from "@/lib/launch/fields";
import { isUsernameAvailable } from "@/server/repositories/waitlist";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-username", 60, 60_000);
  if (limited) return limited;

  const body = await readJsonObject(request);
  const username = asText(body?.username).trim();
  if (!USERNAME_RE.test(username)) {
    return launchOk({ available: false });
  }

  try {
    const available = await isUsernameAvailable(username);
    if (available === null) {
      return launchError(503, "unavailable");
    }
    return launchOk({ available });
  } catch {
    return launchError(500, "unavailable");
  }
}

export function GET() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
