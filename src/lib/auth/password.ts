const PASSWORD_MIN_LENGTH = 8;

/** Idle period after which a password-protected account must be unlocked again. */
export const ACCOUNT_IDLE_LOCK_MS = 7 * 24 * 60 * 60 * 1000;

export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri.`;
  }
  if (password !== confirm) {
    return "Le password non coincidono.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const nextHash = await hashPassword(password);
  return nextHash === passwordHash;
}

export function isAccountIdle(
  lastActiveAt: string | undefined,
  now = Date.now(),
): boolean {
  if (!lastActiveAt) return true;
  const stamp = Date.parse(lastActiveAt);
  if (Number.isNaN(stamp)) return true;
  return now - stamp >= ACCOUNT_IDLE_LOCK_MS;
}
