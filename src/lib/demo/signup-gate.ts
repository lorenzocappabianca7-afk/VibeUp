/** Set by the pre-launch signup. The landing that writes it comes later. */
export const DEMO_SIGNUP_ID_STORAGE_KEY = "vu_signup_id";

const SIGNUP_ID_MAX = 80;

export interface DemoEntryIdentity {
  signupId: string | null;
  email: string;
}

let memorySignupId: string | null = null;

/** Keeps the id when an in-app browser blocks localStorage. */
export function rememberDemoSignupId(signupId: string) {
  const id = signupId.trim();
  if (!id || id.length > SIGNUP_ID_MAX) return;
  memorySignupId = id;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_SIGNUP_ID_STORAGE_KEY, id);
  } catch {
    // Instagram/TikTok webviews can refuse storage. The memory copy still opens this visit.
  }
}

export function readDemoSignupId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value =
      window.localStorage.getItem(DEMO_SIGNUP_ID_STORAGE_KEY)?.trim() ?? "";
    if (value && value.length <= SIGNUP_ID_MAX) {
      memorySignupId = value;
      return value;
    }
  } catch {
    // Fall through to the in-memory id from this document.
  }
  return memorySignupId;
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
  tester?: boolean;
};

const testerKnown = new Map<string, boolean>();

function rememberVerified(id: string, data: SignupStatus) {
  verifiedSignupIds.add(id);
  testerKnown.set(id, data.tester === true);
}

/** True after a status response said this signup may start the demo again. */
export function isKnownDemoTester(signupId: string) {
  return testerKnown.get(signupId.trim()) === true;
}

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
  if (verifiedSignupIds.has(id) && testerKnown.has(id)) return true;
  const data = await requestSignupStatus(id);
  if (data === null) return null;
  if (!isVerifiedStatus(data)) return false;
  rememberVerified(id, data);
  return true;
}

/**
 * Verifies the signup and learns whether a completed demo may restart.
 * Null when the network failed.
 */
export async function ensureSignupKnown(signupId: string): Promise<boolean | null> {
  return confirmVerifiedSignup(signupId);
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
    testerKnown.delete(id);
    return false;
  }
  rememberVerified(id, data);
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
  rememberVerified(id, data);
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
