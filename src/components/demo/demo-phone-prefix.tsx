"use client";

import {
  DEMO_DIAL_COUNTRIES,
  demoDialFlag,
  getDemoDialCountry,
} from "@/lib/demo/phone";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

const prefixButtonClassName =
  "flex shrink-0 items-center gap-1 rounded-xl border border-primary-black/10 bg-background px-2.5 py-3 text-base text-primary-black focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

export function DemoPhonePrefixButton({
  iso2,
  onOpen,
}: {
  iso2: string;
  onOpen: () => void;
}) {
  const country = getDemoDialCountry(iso2);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={prefixButtonClassName}
      aria-label={`Prefisso ${country.name} ${country.dial}`}
      aria-haspopup="dialog"
    >
      <span className="text-[1.15rem] leading-none" aria-hidden>
        {demoDialFlag(country.iso2)}
      </span>
      <span className="font-semibold tabular-nums">{country.dial}</span>
      <ChevronDown
        className="h-3.5 w-3.5 text-primary-black/45"
        aria-hidden
      />
    </button>
  );
}

export function DemoPhonePrefixSheet({
  open,
  iso2,
  onSelect,
  onClose,
}: {
  open: boolean;
  iso2: string;
  onSelect: (nextIso2: string) => void;
  onClose: () => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Chiudi prefissi"
      />
      <div
        className="vibe-sheet-enter relative flex max-h-[min(80dvh,32rem)] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-phone-prefix-title"
      >
        <h2
          id="demo-phone-prefix-title"
          className="shrink-0 px-6 pt-6 text-lg font-bold text-primary-black"
        >
          Prefisso
        </h2>
        <p className="shrink-0 px-6 pt-1 text-sm text-primary-black/55">
          Scorri e tocca il paese.
        </p>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {DEMO_DIAL_COUNTRIES.map((country) => {
            const selected = country.iso2 === iso2;
            return (
              <button
                key={country.iso2}
                type="button"
                ref={selected ? selectedRef : undefined}
                onClick={() => {
                  onSelect(country.iso2);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm",
                  selected
                    ? "bg-brand-teal/15 font-bold text-brand-teal"
                    : "text-primary-black/80",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {demoDialFlag(country.iso2)}
                </span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="shrink-0 tabular-nums">{country.dial}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
