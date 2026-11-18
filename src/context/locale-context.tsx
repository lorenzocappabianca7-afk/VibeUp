"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { writeDemoLanguage, type DemoLanguage } from "@/lib/demo/language";
import { writeLocaleChoice } from "@/lib/locale/cookies";
import { translate } from "@/lib/locale/translate";

interface LocaleContextValue {
  locale: DemoLanguage;
  lang: DemoLanguage;
  setLocale: (locale: DemoLanguage) => void;
  setLang: (locale: DemoLanguage) => void;
  t: (text: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: DemoLanguage;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [fromServer, setFromServer] = useState(initialLocale);
  const saveQueue = useRef(Promise.resolve());
  if (initialLocale !== fromServer) {
    setFromServer(initialLocale);
    setLocaleState(initialLocale);
  }

  useLayoutEffect(() => {
    window.__vibeupDemoLang = locale;
    document.documentElement.lang = locale;
    document.documentElement.dataset.vibeupLang = locale;
    window.__vibeupActivateDemoLang?.();
    writeDemoLanguage(locale);
    const siteTitle = translate(locale, "VibeUp — Organizza feste senza stress");
    const otherTitle = translate(
      locale === "en" ? "it" : "en",
      "VibeUp — Organizza feste senza stress",
    );
    if (document.title === otherTitle || document.title === siteTitle) {
      document.title = siteTitle;
    }
  }, [locale]);

  const setLocale = useCallback((next: DemoLanguage) => {
    setLocaleState(next);
    window.__vibeupDemoLang = next;
    document.documentElement.lang = next;
    document.documentElement.dataset.vibeupLang = next;
    writeLocaleChoice(next);
    saveQueue.current = saveQueue.current
      .then(() =>
        fetch("/api/launch/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        }),
      )
      .then(() => undefined)
      .catch(() => undefined);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const t = (text: string) => translate(locale, text);
    return { locale, lang: locale, setLocale, setLang: setLocale, t };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    const t = (text: string) => text;
    return {
      locale: "it" as const,
      lang: "it" as const,
      setLocale: (_locale: DemoLanguage) => {},
      setLang: (_locale: DemoLanguage) => {},
      t,
    };
  }
  return context;
}

export function useDemoLanguage() {
  const { lang, setLang, t } = useLocale();
  return { lang, setLang, t };
}
