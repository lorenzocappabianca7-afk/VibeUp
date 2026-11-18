import { isSiteLocale } from "@/lib/demo/language";
import { readTrustedSignupId } from "@/server/launch/signup-cookie";
import { launchOk, readJsonObject } from "@/server/launch/request";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import { updateSignupLocale } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

/** Save the language the visitor just picked, so later emails follow it. */
export async function POST(request: NextRequest) {
  const tooBig = rejectLargeRequest(request, 4_000);
  if (tooBig) return tooBig;
  const limited = rateLimit(request, { scope: "launch-locale", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const body = await readJsonObject(request);
  const locale = body?.locale;
  if (!isSiteLocale(locale)) return launchOk({ ok: false });
  try {
    const signupId = await readTrustedSignupId();
    if (!signupId) return launchOk({ ok: true, saved: false });
    const saved = await updateSignupLocale(signupId, locale);
    return launchOk({ ok: saved, saved });
  } catch {
    return launchOk({ ok: false });
  }
}
