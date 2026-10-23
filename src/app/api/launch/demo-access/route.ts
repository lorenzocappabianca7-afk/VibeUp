import { isDemoAccessOpen } from "@/config/demo-access";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { findSignupIdByDemoToken, isDemoAccessToken } from "@/server/launch/demo-access";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-demo-access", 30, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const token = asText(body?.token).trim();
  if (!isDemoAccessToken(token) || !isDemoAccessOpen()) return launchOk({ ok: false });
  try {
    const signupId = await findSignupIdByDemoToken(token);
    if (!signupId) return launchOk({ ok: false });
    return launchOk({ ok: true, signupId });
  } catch {
    return launchError(500, "unavailable");
  }
}
