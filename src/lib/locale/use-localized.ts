"use client";

import { landingCopy } from "@/content/landing";
import { signupCopy } from "@/content/signup";
import { useLocale } from "@/context/locale-context";
import { localize } from "@/lib/locale/translate";
import { useMemo } from "react";

export function useLocalized<T>(source: T): T {
  const { locale } = useLocale();
  return useMemo(() => localize(locale, source), [locale, source]);
}

export function useLandingCopy() {
  return useLocalized(landingCopy);
}

export function useSignupCopy() {
  return useLocalized(signupCopy);
}
