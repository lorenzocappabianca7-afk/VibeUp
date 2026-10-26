import {
  cleanVenue,
  isVibeUpCode,
  joinPhone,
  normalizeCode,
  normalizeEmail,
} from "@/lib/launch/fields";
import { parseSiteLocale } from "@/lib/demo/language";
import { hashClientIp, sendVerificationEmail } from "@/server/launch/code-mail";
import { demoAccessPath, ensureDemoAccessToken } from "@/server/launch/demo-access";
import {
  asText,
  clientIp,
  clientUserAgent,
  guardLaunchRequest,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
  requestOrigin,
} from "@/server/launch/request";
import { deliverWelcomeEmail } from "@/server/launch/welcome-mail";
import {
  finishConfirmedSignup,
  issueEmailCode,
  recordConsents,
  savePendingSignup,
  startEmailSignup,
} from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-signup", 8, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (!body) return launchError(400, "invalid");

  const email = normalizeEmail(asText(body.email));
  const signupId = asText(body.signupId).trim();
  const hasConsents = body.consentPrivacy === true && body.consentRules === true;
  const completing = hasConsents && isUuid(signupId);

  if (!completing) {
    const emailLimited = guardLaunchRequest(
      request,
      "launch-signup-email",
      4,
      60 * 60 * 1000,
      email || "missing",
    );
    if (emailLimited) return emailLimited;
  }

  const referralRaw = normalizeCode(asText(body.referralCode));
  const marketing = body.consentMarketing === true;
  const ipHash = hashClientIp(clientIp(request));
  const draft = {
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
    locale: parseSiteLocale(body.locale),
  };

  if (!hasConsents) {
    const started = await startEmailSignup({
      firstName: draft.firstName,
      lastName: draft.lastName,
      username: draft.username,
      email,
      ipHash,
      locale: draft.locale,
    }).catch(() => null);
    if (!started) return launchError(500, "unavailable");
    if (!started.ok) return launchError(started.error === "invalid" ? 400 : 409, started.error);

    const issued = await issueEmailCode(started.id).catch(() => null);
    if (!issued) return launchError(500, "unavailable");
    if (!issued.ok) {
      if (issued.error === "wait") {
        return launchOk({ signupId: started.id, sentAt: new Date().toISOString() });
      }
      return launchError(409, issued.error);
    }

    const mailed = await sendVerificationEmail({
      to: issued.email,
      firstName: issued.firstName,
      code: issued.code,
      signupId: started.id,
      origin: requestOrigin(request),
      locale: draft.locale,
    });
    if (!mailed.ok) return launchError(503, "send_failed");
    return launchOk({ signupId: started.id, sentAt: issued.sentAt });
  }

  if (completing) {
    const finished = await finishConfirmedSignup(signupId, draft, {
      ipHash,
      userAgent: clientUserAgent(request),
    }).catch(() => null);
    if (!finished) return launchError(500, "unavailable");
    if (!finished.ok) {
      const status = finished.error === "invalid" || finished.error === "not_found" ? 400 : 409;
      return launchError(status, finished.error);
    }
    if (finished.welcomePending) {
      await deliverWelcomeEmail({
        signupId: finished.id,
        email: finished.email,
        firstName: finished.firstName,
        code: finished.vibeupCode,
      }).catch((error: unknown) => {
        console.error("[welcome] invio non riuscito", error instanceof Error ? error.message : error);
      });
    }
    const token = await ensureDemoAccessToken(finished.id).catch(() => null);
    return launchOk({
      signupId: finished.id,
      vibeupCode: finished.vibeupCode,
      ...(token ? { demoPath: demoAccessPath(token) } : {}),
    });
  }

  const saved = await savePendingSignup(draft).catch(() => null);
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
    locale: draft.locale,
  });
  if (!mailed.ok) return launchError(503, "send_failed");
  return launchOk({ signupId: saved.id, sentAt: issued.sentAt });
}
