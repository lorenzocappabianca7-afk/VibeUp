import type { DemoLanguage } from "@/lib/demo/language";
import { writeDemoLanguage } from "@/lib/demo/language";
import {
  LOCALE_COOKIE,
  LOCALE_EXPLICIT_COOKIE,
  LOCALE_MAX_AGE_SECONDS,
} from "@/lib/locale/resolve";

/** Remember a tap. The server reads the same cookies on the next request. */
export function writeLocaleChoice(locale: DemoLanguage) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const base = `; Path=/; Max-Age=${LOCALE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  document.cookie = `${LOCALE_COOKIE}=${locale}${base}`;
  document.cookie = `${LOCALE_EXPLICIT_COOKIE}=1${base}`;
  writeDemoLanguage(locale);
}
