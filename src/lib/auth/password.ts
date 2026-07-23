/**
 * Hardened password hashing (PBKDF2-SHA-256 + salt) with legacy SHA-256 verify support.
 */

const PASSWORD_MIN_LENGTH = 8;
const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_PREFIX = "pbkdf2";

/** Idle period after which a password-protected account must be unlocked again. */
export const ACCOUNT_IDLE_LOCK_MS = 7 * 24 * 60 * 60 * 1000;

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("Hash non valido.");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Constant-time comparison to reduce timing leaks. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function legacySha256Hex(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}

async function derivePbkdf2Hex(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bufferToHex(bits);
}

export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "La password deve contenere almeno una lettera e un numero.";
  }
  if (password !== confirm) {
    return "Le password non coincidono.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bufferToHex(salt)}$${digest}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;

  if (passwordHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = passwordHash.split("$");
    if (parts.length !== 4) return false;
    const iterations = Number.parseInt(parts[1] ?? "", 10);
    const saltHex = parts[2] ?? "";
    const expected = parts[3] ?? "";
    if (!Number.isFinite(iterations) || iterations < 100_000) return false;

    try {
      const salt = hexToBuffer(saltHex);
      const actual = await derivePbkdf2Hex(password, salt, iterations);
      return timingSafeEqualHex(actual, expected);
    } catch {
      return false;
    }
  }

  // Legacy unsalted SHA-256 hashes from earlier builds.
  const legacy = await legacySha256Hex(password);
  return timingSafeEqualHex(legacy, passwordHash);
}

/** True when the stored hash should be upgraded after a successful login. */
export function needsPasswordRehash(passwordHash: string | undefined): boolean {
  return Boolean(passwordHash) && !passwordHash!.startsWith(`${PBKDF2_PREFIX}$`);
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
