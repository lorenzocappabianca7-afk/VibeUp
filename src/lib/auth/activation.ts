import { getSiteUrl } from "@/lib/site";

export const VIBEUP_FROM_EMAIL = "vibeup.planner@gmail.com";
export const VIBEUP_FROM_NAME = "VibeUp";
/** Activation links expire after 48 hours (Airbnb-like). */
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
