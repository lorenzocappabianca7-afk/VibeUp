import { isUnlimitedDemoTesterEmail } from "@/lib/demo/testers";
import { findVerifiedSignup } from "@/server/repositories/waitlist";

/** Email of a verified waitlist signup. Null if the id is missing or the table is unavailable. */
export async function lookupSignupEmail(signupId: string): Promise<string | null> {
  try {
    const row = await findVerifiedSignup(signupId);
    return row?.email ?? null;
  } catch {
    return null;
  }
}

/** Demo writes require a verified signup, unless the email is on the tester allowlist. */
export async function isVerifiedSignupAllowed(
  signupId: string | null | undefined,
  email: string | null | undefined,
) {
  if (isUnlimitedDemoTesterEmail(email)) return true;
  const id = signupId?.trim() ?? "";
  if (!id) return false;
  try {
    return Boolean(await findVerifiedSignup(id));
  } catch {
    return false;
  }
}
