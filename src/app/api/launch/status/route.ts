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
import { attachSignupCookie, clearSignupCookie } from "@/server/launch/signup-cookie";
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
    if (!row) {
      const rejected = launchOk({ ok: false });
      clearSignupCookie(rejected);
      return rejected;
    }
    const inviteCount = await countValidInvitesForCode(row.vibeupCode);
    const accepted = launchOk({
      ok: true,
      vibeupCode: row.vibeupCode,
      firstName: row.firstName,
      inviteCount,
    });
    attachSignupCookie(accepted, row.id);
    return accepted;
  } catch {
    return launchError(500, "unavailable");
  }
}
