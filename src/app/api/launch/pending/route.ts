import { launchOk } from "@/server/launch/request";
import { readVerifySignupId } from "@/server/launch/signup-cookie";
import { readPendingSignup } from "@/server/repositories/waitlist";

export const runtime = "nodejs";

export async function GET() {
  const signupId = await readVerifySignupId();
  if (!signupId) return launchOk({ stage: "none" });
  const pending = await readPendingSignup(signupId).catch(() => null);
  if (!pending) return launchOk({ stage: "none" });
  return launchOk(pending);
}
