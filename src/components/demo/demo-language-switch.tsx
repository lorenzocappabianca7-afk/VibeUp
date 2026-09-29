"use client";

import { useDemoLanguage } from "@/context/demo-language-context";
import { cn } from "@/lib/utils";
import type { DemoLanguage } from "@/lib/demo/language";
import type { ReactNode } from "react";

function ItalianFlag() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden className="h-3.5 w-5 rounded-[2px]">
      <rect width="6" height="12" fill="#009246" />
      <rect x="6" width="6" height="12" fill="#F4F5F0" />
      <rect x="12" width="6" height="12" fill="#CE2B37" />
    </svg>
  );
}

function EnglishFlag() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden className="h-3.5 w-5 rounded-[2px]">
      <rect width="18" height="12" fill="#012169" />
      <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2.4" />
      <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1.2" />
      <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="4" />
      <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="2" />
    </svg>
  );
}

export function DemoLanguageSwitch() {
  const { lang, setLang } = useDemoLanguage();

  return (
    <div
      translate="no"
      className="flex items-center gap-1 rounded-full bg-surface/95 p-1 shadow-lg ring-1 ring-primary-black/10"
    >
      <FlagButton
        language="it"
        label="Italiano"
        selected={lang === "it"}
        onSelect={setLang}
      >
        <ItalianFlag />
      </FlagButton>
      <FlagButton
        language="en"
        label="English"
        selected={lang === "en"}
        onSelect={setLang}
      >
        <EnglishFlag />
      </FlagButton>
    </div>
  );
}

function FlagButton({
  language,
  label,
  selected,
  onSelect,
  children,
}: {
  language: DemoLanguage;
  label: string;
  selected: boolean;
  onSelect: (language: DemoLanguage) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      translate="no"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(language)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        selected ? "bg-brand-teal/20 ring-2 ring-brand-teal" : "hover:bg-primary-black/5",
      )}
    >
      {children}
    </button>
  );
}
