import {
  asText,
  guardLaunchRequest,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { countValidInvitesForCode } from "@/server/repositories/contest";
import { findVerifiedSignup } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-status", 40, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const signupId = asText(body?.signupId).trim();
  if (!isUuid(signupId)) return launchOk({ ok: false });
  try {
    const row = await findVerifiedSignup(signupId);
    if (!row) return launchOk({ ok: false });
    const inviteCount = await countValidInvitesForCode(row.vibeupCode);
    return launchOk({
      ok: true,
      vibeupCode: row.vibeupCode,
      firstName: row.firstName,
      inviteCount,
    });
  } catch {
    return launchError(500, "unavailable");
  }
}
