import { parseSiteLocale } from "@/lib/demo/language";
import { sendVerificationEmail } from "@/server/launch/code-mail";
import { domainHasMx } from "@/server/launch/mx";
import { attachVerifyCookie } from "@/server/launch/signup-cookie";
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
import { issueEmailCode, readSignupEmail, readSignupLocale, recordVerifyMail, updateSignupLocale } from "@/server/repositories/waitlist";
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
    const domain = (email ?? "").split("@")[1] ?? "";
    if (domain && (await domainHasMx(domain)) === false) return launchError(400, "no_mx");
    const requested = asText(body?.locale).trim();
    const locale = requested === "en" || requested === "it" ? parseSiteLocale(requested) : await readSignupLocale(signupId);
    if (requested === "en" || requested === "it") await updateSignupLocale(signupId, locale);
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
      confirmToken: issued.confirmToken,
      signupId,
      origin: requestOrigin(request),
      locale,
    });
    if (!mailed.ok) {
      await recordVerifyMail(signupId, "error", null);
      return launchError(503, "send_failed");
    }
    await recordVerifyMail(signupId, "sent", mailed.id);
    const response = launchOk({ sentAt: issued.sentAt });
    attachVerifyCookie(response, signupId);
    return response;
  } catch {
    return launchError(500, "unavailable");
  }
}
