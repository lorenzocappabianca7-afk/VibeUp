export type DemoLanguage = "it" | "en";

/** Chosen on the landing and reused by the demo. */
export const SITE_LOCALE_STORAGE_KEY = "vu_locale";
/** Kept in step with vu_locale so the existing demo translator still sees it. */
export const DEMO_LANGUAGE_STORAGE_KEY = "vibeup-demo-lang";

export function isSiteLocale(value: unknown): value is DemoLanguage {
  return value === "it" || value === "en";
}

export function parseSiteLocale(value: unknown): DemoLanguage {
  return value === "en" ? "en" : "it";
}

/** Explicit choice only. Empty when the visitor has not picked a language. */
export function readStoredLocale(): DemoLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const chosen = window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY);
    if (isSiteLocale(chosen)) return chosen;
    const legacy = window.localStorage.getItem(DEMO_LANGUAGE_STORAGE_KEY);
    if (isSiteLocale(legacy)) return legacy;
    return null;
  } catch {
    return null;
  }
}

export function browserLocale(): DemoLanguage {
  if (typeof navigator === "undefined") return "it";
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "it";
}

export function readDemoLanguage(): DemoLanguage {
  return readStoredLocale() ?? browserLocale();
}

export function writeDemoLanguage(language: DemoLanguage) {
  try {
    window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, language);
    window.localStorage.setItem(DEMO_LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* private mode */
  }
}

declare global {
  interface Window {
    __vibeupDemoLang?: DemoLanguage;
    __vibeupActivateDemoLang?: () => void;
  }
}
