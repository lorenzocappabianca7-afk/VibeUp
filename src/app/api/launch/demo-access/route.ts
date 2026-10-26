import { isDemoAccessOpen } from "@/config/demo-access";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { findSignupByDemoToken, isDemoAccessToken } from "@/server/launch/demo-access";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-demo-access", 30, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const token = asText(body?.token).trim();
  if (!isDemoAccessToken(token) || !isDemoAccessOpen()) return launchOk({ ok: false });
  try {
    const found = await findSignupByDemoToken(token);
    if (!found) return launchOk({ ok: false });
    return launchOk({ ok: true, signupId: found.signupId, locale: found.locale });
  } catch {
    return launchError(500, "unavailable");
  }
}
