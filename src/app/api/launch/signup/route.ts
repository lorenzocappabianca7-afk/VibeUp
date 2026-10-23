import {
  cleanVenue,
  isVibeUpCode,
  joinPhone,
  normalizeCode,
  normalizeEmail,
} from "@/lib/launch/fields";
import { hashClientIp, sendVerificationEmail } from "@/server/launch/code-mail";
import {
  asText,
  clientIp,
  clientUserAgent,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
  requestOrigin,
} from "@/server/launch/request";
import { issueEmailCode, recordConsents, savePendingSignup } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-signup", 8, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (!body) return launchError(400, "invalid");

  const email = normalizeEmail(asText(body.email));
  const emailLimited = guardLaunchRequest(
    request,
    "launch-signup-email",
    4,
    60 * 60 * 1000,
    email || "missing",
  );
  if (emailLimited) return emailLimited;

  if (body.consentPrivacy !== true || body.consentRules !== true) {
    return launchError(400, "invalid");
  }

  const referralRaw = normalizeCode(asText(body.referralCode));
  const marketing = body.consentMarketing === true;
  const ipHash = hashClientIp(clientIp(request));
  const saved = await savePendingSignup({
    firstName: asText(body.firstName),
    lastName: asText(body.lastName),
    username: asText(body.username),
    email,
    phone: joinPhone(asText(body.phonePrefix) || "+39", asText(body.phoneNational)),
    birthYear: Number(body.birthYear),
    highSchool: asText(body.highSchool),
    dreamVenue: cleanVenue(asText(body.dreamVenue)) || null,
    referralCode: isVibeUpCode(referralRaw) ? referralRaw : null,
    consentMarketing: marketing,
    ipHash,
  }).catch(() => null);

  if (!saved) return launchError(500, "unavailable");
  if (!saved.ok) return launchError(saved.error === "invalid" ? 400 : 409, saved.error);

  const logged = await recordConsents({
    signupId: saved.id,
    marketing,
    ipHash,
    userAgent: clientUserAgent(request),
  }).catch(() => null);
  if (!logged?.ok) return launchError(500, "unavailable");

  const issued = await issueEmailCode(saved.id).catch(() => null);
  if (!issued) return launchError(500, "unavailable");
  if (!issued.ok) {
    if (issued.error === "wait") {
      return launchOk({ signupId: saved.id, sentAt: new Date().toISOString() });
    }
    return launchError(409, issued.error);
  }

  const mailed = await sendVerificationEmail({
    to: issued.email,
    firstName: issued.firstName,
    code: issued.code,
    signupId: saved.id,
    origin: requestOrigin(request),
  });
  if (!mailed.ok) return launchError(503, "send_failed");
  return launchOk({ signupId: saved.id, sentAt: issued.sentAt });
}
