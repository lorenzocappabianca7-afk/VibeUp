import type { CookieOptions } from "@supabase/ssr";

/**
 * Persistent auth cookies (not session cookies).
 * 400 days is the browser/Chromium cap for Max-Age.
 * Refresh still happens automatically while the refresh token is valid.
 */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Recommended dashboard refresh-token lifetime, matching cookie max-age. */
export const AUTH_REFRESH_TOKEN_RECOMMENDED_DAYS = 400;

export function getAuthCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Keep maxAge=0 when Supabase is deleting cookies on sign-out. */
export function withAuthCookieOptions(options?: CookieOptions): CookieOptions {
  const defaults = getAuthCookieOptions();
  const clearing = options?.maxAge === 0;
  return {
    ...defaults,
    ...options,
    path: options?.path ?? defaults.path,
    sameSite: options?.sameSite ?? defaults.sameSite,
    maxAge: clearing ? 0 : (options?.maxAge ?? defaults.maxAge),
    httpOnly: false,
    secure: options?.secure ?? defaults.secure,
  };
}

export const supabaseBrowserAuthOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
} as const;
