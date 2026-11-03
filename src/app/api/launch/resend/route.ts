import { sendVerificationEmail } from "@/server/launch/code-mail";
import { isTesterEmail } from "@/server/launch/testers";
import {
  asText,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
  requestOrigin,
} from "@/server/launch/request";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { issueEmailCode, readSignupEmail, readSignupLocale } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tooBig = rejectLargeRequest(request, 16_000);
  if (tooBig) return tooBig;
  const body = await readJsonObject(request);
  const signupId = asText(body?.signupId).trim();
  if (!isUuid(signupId)) return launchError(400, "invalid");

  try {
    const email = await readSignupEmail(signupId);
    const tester = isTesterEmail(email);
    const limited = rateLimit(request, {
      scope: "launch-resend",
      limit: tester ? 60 : 6,
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;
    const issued = await issueEmailCode(signupId, { enforceWait: !tester });
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
      locale: await readSignupLocale(signupId),
    });
    if (!mailed.ok) return launchError(503, "send_failed");
    return launchOk({ sentAt: issued.sentAt });
  } catch {
    return launchError(500, "unavailable");
  }
}
