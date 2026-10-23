import { isVibeUpCode, normalizeCode } from "@/lib/launch/fields";
import { referralExists } from "@/server/repositories/waitlist";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-referral", 30, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const code = normalizeCode(asText(body?.code));
  if (!isVibeUpCode(code)) return launchOk({ exists: false });
  try {
    const exists = await referralExists(code);
    if (exists === null) return launchError(503, "unavailable");
    return launchOk({ exists });
  } catch {
    return launchError(500, "unavailable");
  }
}
