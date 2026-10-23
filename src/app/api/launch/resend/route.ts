import { sendVerificationEmail } from "@/server/launch/code-mail";
import {
  asText,
  guardLaunchRequest,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
  requestOrigin,
} from "@/server/launch/request";
import { issueEmailCode } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-resend", 6, 60 * 60 * 1000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const signupId = asText(body?.signupId).trim();
  if (!isUuid(signupId)) return launchError(400, "invalid");

  try {
    const issued = await issueEmailCode(signupId, { enforceWait: true });
    if (!issued.ok) {
      if (issued.error === "wait") {
        return launchError(429, "wait", { retryAfter: issued.retryAfter ?? 30 });
      }
      return launchError(issued.error === "not_found" ? 404 : 409, issued.error);
    }
    const mailed = await sendVerificationEmail({
      to: issued.email,
      firstName: issued.firstName,
      code: issued.code,
      signupId,
      origin: requestOrigin(request),
    });
    if (!mailed.ok) return launchError(503, "send_failed");
    return launchOk({ sentAt: issued.sentAt });
  } catch {
    return launchError(500, "unavailable");
  }
}
