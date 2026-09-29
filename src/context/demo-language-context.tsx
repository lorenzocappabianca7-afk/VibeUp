"use client";

import {
  readDemoLanguage,
  writeDemoLanguage,
  type DemoLanguage,
} from "@/lib/demo/language";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface DemoLanguageContextValue {
  lang: DemoLanguage;
  setLang: (language: DemoLanguage) => void;
}

const DemoLanguageContext = createContext<DemoLanguageContextValue | null>(
  null,
);

export function DemoLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<DemoLanguage>("it");

  useEffect(() => {
    const stored = readDemoLanguage();
    setLangState(stored);
    window.__vibeupActivateDemoLang?.();
  }, []);

  const setLang = (language: DemoLanguage) => {
    if (language === readDemoLanguage() && language === lang) return;
    writeDemoLanguage(language);
    window.location.reload();
  };

  const value = useMemo(() => ({ lang, setLang }), [lang]);

  return (
    <DemoLanguageContext.Provider value={value}>
      {children}
    </DemoLanguageContext.Provider>
  );
}

export function useDemoLanguage() {
  const context = useContext(DemoLanguageContext);
  if (!context) {
    return {
      lang: "it" as const,
      setLang: (_language: DemoLanguage) => {},
    };
  }
  return context;
}
