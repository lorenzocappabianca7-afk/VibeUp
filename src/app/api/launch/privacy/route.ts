import { isEmailAddress, normalizeEmail } from "@/lib/launch/fields";
import { sendPrivacyCodeEmail } from "@/server/launch/code-mail";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
  requestOrigin,
} from "@/server/launch/request";
import { issuePrivacyCode } from "@/server/repositories/privacy";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-privacy", 8, 60 * 60 * 1000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const email = normalizeEmail(asText(body?.email));
  const emailLimited = guardLaunchRequest(
    request,
    "launch-privacy-email",
    4,
    60 * 60 * 1000,
    email || "missing",
  );
  if (emailLimited) return emailLimited;
  if (!isEmailAddress(email)) return launchOk({ ok: true });

  try {
    const issued = await issuePrivacyCode(email);
    if (!issued.ok) return launchError(503, "unavailable");
    if (issued.sent) {
      const mailed = await sendPrivacyCodeEmail({
        to: issued.email,
        code: issued.code,
        signupId: issued.signupId,
        origin: requestOrigin(request),
      });
      if (!mailed.ok) return launchError(503, "send_failed");
    }
    return launchOk({ ok: true });
  } catch {
    return launchError(500, "unavailable");
  }
}
