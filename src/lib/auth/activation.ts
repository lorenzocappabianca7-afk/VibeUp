import { getSiteUrl } from "@/lib/site";

export const ACTIVATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export function createActivationToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function getActivationExpiryIso(now = Date.now()) {
  return new Date(now + ACTIVATION_TOKEN_TTL_MS).toISOString();
}

/** Dev-only local fallback when Supabase Auth is not configured. */
export function buildActivationUrl(token: string) {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/activate?token=${encodeURIComponent(token)}`;
}

export function isActivationTokenExpired(expiresAt: string | undefined) {
  if (!expiresAt) return true;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return true;
  return Date.now() > expires;
}
