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

/** Demo writes require a verified signup id. Tester mail does not skip this check. */
export async function isVerifiedSignupAllowed(signupId: string | null | undefined) {
  const id = signupId?.trim() ?? "";
  if (!id) return false;
  try {
    return Boolean(await findVerifiedSignup(id));
  } catch {
    return false;
  }
}
