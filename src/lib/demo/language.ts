export type DemoLanguage = "it" | "en";

export const DEMO_LANGUAGE_STORAGE_KEY = "vibeup-demo-lang";

export function readDemoLanguage(): DemoLanguage {
  if (typeof window === "undefined") return "it";
  try {
    return window.localStorage.getItem(DEMO_LANGUAGE_STORAGE_KEY) === "en"
      ? "en"
      : "it";
  } catch {
    return "it";
  }
}

export function writeDemoLanguage(language: DemoLanguage) {
  try {
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
