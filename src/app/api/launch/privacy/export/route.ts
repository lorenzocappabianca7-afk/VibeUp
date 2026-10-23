import { normalizeEmail } from "@/lib/launch/fields";
import {
  asText,
  guardLaunchRequest,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { exportSignupData } from "@/server/repositories/privacy";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

function statusFor(error: string) {
  if (error === "unavailable") return 503;
  return 400;
}

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-privacy-export", 12, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const email = normalizeEmail(asText(body?.email));
  const code = asText(body?.code);
  try {
    const result = await exportSignupData(email, code);
    if (!result.ok) return launchError(statusFor(result.error), result.error);
    return launchOk({
      ok: true,
      signupId: result.signupId,
      export: result.export,
    });
  } catch {
    return launchError(500, "unavailable");
  }
}
