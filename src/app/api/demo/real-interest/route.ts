import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { hashClientIp } from "@/server/launch/code-mail";
import {
  asText,
  clientIp,
  clientUserAgent,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import {
  maskedSignupContact,
  readSignupContact,
  saveRealInterest,
  type RealInterestChannel,
} from "@/server/repositories/real-interest";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

const HOUR = 60 * 60 * 1000;

function asChannel(value: unknown): RealInterestChannel | null {
  return value === "whatsapp" || value === "email" ? value : null;
}

function clip(value: unknown, max: number) {
  return asText(value).trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const tooBig = rejectLargeRequest(request, 16_000);
  if (tooBig) return tooBig;

  const body = await readJsonObject(request);
  if (!body) return launchError(400, "invalid");
  const signupId = clip(body.signupId, 80);
  if (!isUuid(signupId)) return launchError(400, "invalid");

  const limited = rateLimit(request, {
    scope: "demo-real-interest",
    limit: 8,
    windowMs: HOUR,
    bucket: signupId,
  });
  if (limited) return limited;

  if (body.preview === true) {
    const signup = await readSignupContact(signupId);
    if (!signup) return launchError(404, "not_found");
    return launchOk(maskedSignupContact(signup));
  }

  const channel = asChannel(body.channel);
  const partyDate = clip(body.partyDate, 10);
  const locationId = clip(body.locationId, 80);
  const locationName = clip(body.locationName, 120);
  const guestCount = Number(body.guestCount);
  if (!channel || !partyDate || !locationName) return launchError(400, "invalid");

  const ip = clientIp(request);
  const result = await saveRealInterest({
    signupId,
    locationId,
    locationName,
    partyDate,
    guestCount: Number.isFinite(guestCount) ? Math.round(guestCount) : 0,
    channel,
    consent: body.consent === true,
    ipHash: ip ? hashClientIp(ip) : null,
    userAgent: clientUserAgent(request),
  });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "already" ? 409 : 400;
    return launchError(status, result.error);
  }
  return launchOk({ id: result.id });
}
