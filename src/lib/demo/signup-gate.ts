import {
  isUnlimitedDemoTesterEmail,
  readRememberedDemoTesterEmail,
} from "@/lib/demo/testers";

/** Set by the pre-launch signup. The landing that writes it comes later. */
export const DEMO_SIGNUP_ID_STORAGE_KEY = "vu_signup_id";

const SIGNUP_ID_MAX = 80;

export interface DemoEntryIdentity {
  signupId: string | null;
  email: string;
}

export function readDemoSignupId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value =
      window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY)?.trim() ?? "";
    if (!value || value.length > SIGNUP_ID_MAX) return null;
    return value;
  } catch {
    return null;
  }
}

/** Local identity only. The server still checks that the signup id is verified. */
export function demoEntryIdentity(
  accountEmail?: string | null,
): DemoEntryIdentity | null {
  const signupId = readDemoSignupId();
  const fromAccount = isUnlimitedDemoTesterEmail(accountEmail)
    ? accountEmail!.trim().toLowerCase()
    : null;
  const remembered = readRememberedDemoTesterEmail();
  const email = fromAccount || remembered || "";
  if (!signupId && !email) return null;
  return { signupId, email };
}

const verifiedSignupIds = new Set<string>();

/** True when this browser's signup id is a verified waitlist row. */
export async function confirmVerifiedSignup(signupId: string): Promise<boolean> {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return false;
  if (verifiedSignupIds.has(id)) return true;
  try {
    const response = await fetch("/api/launch/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId: id }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { ok?: boolean; vibeupCode?: string };
    if (data.ok === true && typeof data.vibeupCode === "string" && data.vibeupCode) {
      verifiedSignupIds.add(id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export type VerifiedMemberCard = {
  code: string;
  firstName: string;
  inviteCount: number;
};

export async function readVerifiedMember(signupId: string): Promise<VerifiedMemberCard | null> {
  const id = signupId.trim();
  if (!id) return null;
  try {
    const response = await fetch("/api/launch/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId: id }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      ok?: boolean;
      vibeupCode?: string;
      firstName?: string;
      inviteCount?: number;
    };
    if (data.ok !== true || typeof data.vibeupCode !== "string" || !data.vibeupCode) return null;
    const inviteCount = Number.isInteger(data.inviteCount) && (data.inviteCount ?? 0) >= 0
      ? (data.inviteCount as number)
      : 0;
    verifiedSignupIds.add(id);
    return {
      code: data.vibeupCode,
      firstName: typeof data.firstName === "string" ? data.firstName.trim() : "",
      inviteCount,
    };
  } catch {
    return null;
  }
}

export async function readVerifiedSignupCode(signupId: string): Promise<string | null> {
  const member = await readVerifiedMember(signupId);
  return member?.code ?? null;
}
