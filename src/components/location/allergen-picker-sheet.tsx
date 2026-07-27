"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { MENU_ALLERGEN_OPTIONS } from "@/lib/menu-allergens";
import { cn, MODAL_SAFE_BOTTOM_STYLE } from "@/lib/utils";
import { Check, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AllergenPickerSheetProps {
  open: boolean;
  initialSelected?: string[];
  title?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (allergens: string[]) => void;
}

export function AllergenPickerSheet({
  open,
  initialSelected = [],
  title = "Allergeni da evitare",
  description = "Seleziona gli allergeni degli invitati. Il menu si adatterà escludendo i piatti non adatti.",
  confirmLabel = "Conferma allergeni",
  onClose,
  onConfirm,
}: AllergenPickerSheetProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setSelected(initialSelected);
  }, [open, initialSelected]);

  if (!open) return null;

  function toggle(allergen: string) {
    setSelected((current) =>
      current.includes(allergen)
        ? current.filter((item) => item !== allergen)
        : [...current, allergen],
    );
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Chiudi selezione allergeni"
        onClick={onClose}
      />
      <div
        className="vibe-sheet-enter relative flex max-h-[min(88dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl"
        style={MODAL_SAFE_BOTTOM_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergen-picker-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-primary-black/8 px-5 py-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-brand-pink">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              Menu location
            </p>
            <h2
              id="allergen-picker-title"
              className="mt-1 text-lg font-bold text-primary-black"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-primary-black/60">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="smooth-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="grid grid-cols-2 gap-2">
            {MENU_ALLERGEN_OPTIONS.map((allergen) => {
              const active = selected.includes(allergen);
              return (
                <li key={allergen}>
                  <button
                    type="button"
                    onClick={() => toggle(allergen)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      active
                        ? "border-brand-pink bg-brand-pink/15 text-primary-black"
                        : "border-primary-black/10 bg-background text-primary-black/70 hover:border-primary-black/25",
                    )}
                    aria-pressed={active}
                  >
                    <span>{allergen}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        active
                          ? "border-brand-pink bg-brand-pink text-ink-inverse"
                          : "border-primary-black/20",
                      )}
                    >
                      {active && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-primary-black/50">
            Puoi anche non selezionare nulla se non ci sono restrizioni.
          </p>
        </div>

        <div className="border-t border-primary-black/8 px-5 py-4">
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="w-full rounded-2xl bg-brand-teal px-4 py-3 text-sm font-black text-ink-inverse transition-colors hover:bg-brand-teal/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
