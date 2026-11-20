import { findSignupByDemoToken } from "@/server/launch/demo-access";
import { isUuid } from "@/server/launch/request";
import { signupIdFromCookie, verifyIdFromCookie } from "@/server/launch/signup-cookie";
import { readSignupLocaleChoice } from "@/server/repositories/waitlist";
import { resolveLocale, LOCALE_COOKIE, LOCALE_EXPLICIT_COOKIE } from "@/lib/locale/resolve";
import { cookies, headers } from "next/headers";
import { cache } from "react";

/** Locale for this request. Explicit choice, then signup, then the browser. */
export const getRequestLocale = cache(async () => {
  const jar = await cookies();
  const headerStore = await headers();
  const explicit = jar.get(LOCALE_EXPLICIT_COOKIE)?.value;
  const chosen = jar.get(LOCALE_COOKIE)?.value;
  let signupLocale: string | null = null;
  if (explicit !== "1") {
    const search = headerStore.get("x-vu-search") ?? "";
    const token = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      .get("t")
      ?.trim();
    if (token) {
      try {
        signupLocale = (await findSignupByDemoToken(token))?.locale ?? null;
      } catch {
        signupLocale = null;
      }
    }
    if (!signupLocale) {
      const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      const sid = params.get("sid")?.trim() ?? "";
      if (params.get("open") === "signup" && isUuid(sid)) {
        signupLocale = await readSignupLocaleChoice(sid);
      }
    }
    if (!signupLocale) {
      const signupId =
        signupIdFromCookie(jar.get("vu_signup")?.value) ??
        verifyIdFromCookie(jar.get("vu_verify")?.value);
      if (signupId) signupLocale = await readSignupLocaleChoice(signupId);
    }
  }
  return resolveLocale({
    explicit,
    chosen,
    signupLocale,
    acceptLanguage: headerStore.get("accept-language"),
  });
});
