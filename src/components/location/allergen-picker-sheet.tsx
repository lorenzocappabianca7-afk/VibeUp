"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  coerceAllergenRestrictions,
  MENU_ALLERGEN_OPTIONS,
  normalizeAllergenRestrictions,
} from "@/lib/menu-allergens";
import { cn, MODAL_SAFE_BOTTOM_STYLE } from "@/lib/utils";
import type { MenuAllergenRestriction } from "@/types/event";
import { Check, Minus, Plus, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AllergenPickerSheetProps {
  open: boolean;
  initialSelected?: MenuAllergenRestriction[] | string[];
  maxGuests?: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (allergens: MenuAllergenRestriction[]) => void;
}

export function AllergenPickerSheet({
  open,
  initialSelected = [],
  maxGuests = 300,
  title = "Allergeni da evitare",
  description = "Seleziona gli allergeni e quante persone li devono evitare. Il menu si adatterà escludendo i piatti non adatti.",
  confirmLabel = "Conferma allergeni",
  onClose,
  onConfirm,
}: AllergenPickerSheetProps) {
  const [selected, setSelected] = useState<MenuAllergenRestriction[]>(() =>
    normalizeAllergenRestrictions(
      coerceAllergenRestrictions(initialSelected),
      maxGuests,
    ),
  );

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setSelected(
      normalizeAllergenRestrictions(
        coerceAllergenRestrictions(initialSelected),
        maxGuests,
      ),
    );
  }, [open, initialSelected, maxGuests]);

  if (!open) return null;

  function getCount(allergen: string) {
    return selected.find((item) => item.name === allergen)?.guestCount ?? 0;
  }

  function toggle(allergen: string) {
    setSelected((current) => {
      if (current.some((item) => item.name === allergen)) {
        return current.filter((item) => item.name !== allergen);
      }
      return [...current, { name: allergen, guestCount: 1 }];
    });
  }

  function setCount(allergen: string, nextCount: number) {
    setSelected((current) => {
      const existing = current.find((item) => item.name === allergen);
      if (!existing) {
        if (nextCount < 1) return current;
        return [
          ...current,
          {
            name: allergen,
            guestCount: Math.min(Math.max(1, nextCount), maxGuests),
          },
        ];
      }

      if (nextCount < 1) {
        return current.filter((item) => item.name !== allergen);
      }

      return current.map((item) =>
        item.name === allergen
          ? {
              ...item,
              guestCount: Math.min(Math.max(1, nextCount), maxGuests),
            }
          : item,
      );
    });
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
          <ul className="space-y-2">
            {MENU_ALLERGEN_OPTIONS.map((allergen) => {
              const count = getCount(allergen);
              const active = count > 0;

              return (
                <li key={allergen}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors",
                      active
                        ? "border-brand-pink bg-brand-pink/15"
                        : "border-primary-black/10 bg-background",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(allergen)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                      aria-pressed={active}
                    >
                      <span className="text-sm font-semibold text-primary-black">
                        {allergen}
                      </span>
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

                    {active && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary-black/10 bg-background px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => setCount(allergen, count - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-pink text-white"
                          aria-label={`Diminuisci persone per ${allergen}`}
                        >
                          <Minus className="h-3 w-3" aria-hidden />
                        </button>
                        <span
                          className="min-w-[1.75rem] text-center text-sm font-black tabular-nums text-primary-black"
                          aria-label={`Persone con ${allergen}`}
                        >
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCount(allergen, count + 1)}
                          disabled={count >= maxGuests}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-pink text-white disabled:opacity-40"
                          aria-label={`Aumenta persone per ${allergen}`}
                        >
                          <Plus className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-primary-black/50">
            Alla selezione il numero parte da 1. Puoi non selezionare nulla se
            non ci sono restrizioni.
          </p>
        </div>

        <div className="border-t border-primary-black/8 px-5 py-4">
          <button
            type="button"
            onClick={() =>
              onConfirm(normalizeAllergenRestrictions(selected, maxGuests))
            }
            className="w-full rounded-2xl bg-brand-teal px-4 py-3 text-sm font-black text-ink-inverse transition-colors hover:bg-brand-teal/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
