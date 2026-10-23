import {
  asText,
  guardLaunchRequest,
  isUuid,
  launchError,
  launchOk,
  readJsonObject,
} from "@/server/launch/request";
import { demoAccessPath, ensureDemoAccessToken } from "@/server/launch/demo-access";
import { deliverWelcomeEmail } from "@/server/launch/welcome-mail";
import { verifyEmailCode } from "@/server/repositories/waitlist";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = guardLaunchRequest(request, "launch-verify", 12, 60_000);
  if (limited) return limited;
  const body = await readJsonObject(request);
  const signupId = asText(body?.signupId).trim();
  const code = asText(body?.code);
  if (!isUuid(signupId)) return launchError(400, "invalid");

  try {
    const result = await verifyEmailCode(signupId, code);
    if (!result.ok) {
      const status =
        result.error === "expired" || result.error === "mismatch" || result.error === "locked"
          ? 400
          : result.error === "not_found"
            ? 404
            : 500;
      return launchError(status, result.error);
    }
    if (result.confirmed) {
      return launchOk({ signupId, confirmed: true });
    }
    if (result.welcomePending) {
      await deliverWelcomeEmail({
        signupId,
        email: result.email,
        firstName: result.firstName,
        code: result.vibeupCode,
      }).catch((error: unknown) => {
        console.error("[welcome] invio non riuscito", error instanceof Error ? error.message : error);
      });
    }
    const token = await ensureDemoAccessToken(signupId).catch(() => null);
    return launchOk({
      signupId,
      vibeupCode: result.vibeupCode,
      ...(token ? { demoPath: demoAccessPath(token) } : {}),
    });
  } catch {
    return launchError(500, "unavailable");
  }
}
