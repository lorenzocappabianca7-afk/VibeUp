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
export function demoEntryIdentity(): DemoEntryIdentity | null {
  const signupId = readDemoSignupId();
  if (!signupId) return null;
  return { signupId, email: "" };
}

const verifiedSignupIds = new Set<string>();

type SignupStatus = {
  ok?: boolean;
  vibeupCode?: string;
  firstName?: string;
  inviteCount?: number;
};

const statusInflight = new Map<string, Promise<SignupStatus | null>>();

function requestSignupStatus(id: string) {
  const existing = statusInflight.get(id);
  if (existing) return existing;
  const pending = fetch("/api/launch/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signupId: id }),
  })
    .then(async (response) => {
      if (!response.ok) return null;
      return (await response.json()) as SignupStatus;
    })
    .catch(() => null)
    .finally(() => {
      statusInflight.delete(id);
    });
  statusInflight.set(id, pending);
  return pending;
}

function isVerifiedStatus(data: SignupStatus | null): data is SignupStatus & { vibeupCode: string } {
  return data?.ok === true && typeof data.vibeupCode === "string" && data.vibeupCode.length > 0;
}

/** Remember a signup the server already accepted, so the first paint does not wait on the network. */
export function trustSignupVerified(signupId: string) {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return;
  verifiedSignupIds.add(id);
}

/**
 * True when this browser's signup id is a verified waitlist row.
 * Null when the check could not reach the server.
 */
export async function confirmVerifiedSignup(signupId: string): Promise<boolean | null> {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return false;
  if (verifiedSignupIds.has(id)) return true;
  const data = await requestSignupStatus(id);
  if (data === null) return null;
  if (!isVerifiedStatus(data)) return false;
  verifiedSignupIds.add(id);
  return true;
}

/**
 * Checks again after a trusted entry. False only when the server rejects the id.
 * Null means the network failed: keep the demo open.
 */
export async function revalidateVerifiedSignup(signupId: string): Promise<boolean | null> {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return false;
  const data = await requestSignupStatus(id);
  if (data === null) return null;
  if (!isVerifiedStatus(data)) {
    verifiedSignupIds.delete(id);
    return false;
  }
  verifiedSignupIds.add(id);
  return true;
}

export type VerifiedMemberCard = {
  code: string;
  firstName: string;
  inviteCount: number;
};

export async function readVerifiedMember(signupId: string): Promise<VerifiedMemberCard | null> {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return null;
  const data = await requestSignupStatus(id);
  if (!isVerifiedStatus(data)) return null;
  const inviteCount = Number.isInteger(data.inviteCount) && (data.inviteCount ?? 0) >= 0
    ? (data.inviteCount as number)
    : 0;
  verifiedSignupIds.add(id);
  return {
    code: data.vibeupCode,
    firstName: typeof data.firstName === "string" ? data.firstName.trim() : "",
    inviteCount,
  };
}

export async function readVerifiedSignupCode(signupId: string): Promise<string | null> {
  const member = await readVerifiedMember(signupId);
  return member?.code ?? null;
}
