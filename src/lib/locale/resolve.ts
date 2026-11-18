import { isSiteLocale, type DemoLanguage } from "@/lib/demo/language";

/** One year. The language cookie outlives a demo visit. */
export const LOCALE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const LOCALE_COOKIE = "vu_locale";
/** Set only when the visitor taps a language. Inferred languages never set this. */
export const LOCALE_EXPLICIT_COOKIE = "vu_locale_explicit";

/**
 * 1. Last explicit choice.
 * 2. Signup language (email link or signed-in row), passed in by the caller.
 * 3. English when the browser asks for English, otherwise Italian.
 */
export function resolveLocale(input: {
  explicit: string | null | undefined;
  chosen: string | null | undefined;
  signupLocale: string | null | undefined;
  acceptLanguage: string | null | undefined;
}): DemoLanguage {
  if (input.explicit === "1" && isSiteLocale(input.chosen)) return input.chosen;
  if (isSiteLocale(input.signupLocale)) return input.signupLocale;
  return acceptLanguagePrefersEnglish(input.acceptLanguage) ? "en" : "it";
}

export function acceptLanguagePrefersEnglish(header: string | null | undefined) {
  if (!header) return false;
  const first = header.split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en");
}
