"use client";

import { cn } from "@/lib/utils";
import {
  EXPLORE_PRICE_MIN,
  EXPLORE_PRICE_STEP,
} from "@/types/location";
import { useEffect, useMemo, useState } from "react";

interface PriceRangeInputsProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
}

function parseBudget(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeRange(min: number, max: number): [number, number] {
  const safeMin = Math.max(EXPLORE_PRICE_MIN, min);
  const safeMax = Math.max(safeMin, max);
  return [safeMin, safeMax];
}

const inputClassName =
  "w-full rounded-2xl border border-primary-black/10 bg-background px-3.5 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function PriceRangeInputs({
  value,
  onChange,
  className,
}: PriceRangeInputsProps) {
  const [minValue, maxValue] = value;
  const [minDraft, setMinDraft] = useState(String(minValue));
  const [maxDraft, setMaxDraft] = useState(String(maxValue));
  const [minFocused, setMinFocused] = useState(false);
  const [maxFocused, setMaxFocused] = useState(false);

  useEffect(() => {
    if (minFocused) return;
    setMinDraft(String(minValue));
  }, [minFocused, minValue]);

  useEffect(() => {
    if (maxFocused) return;
    setMaxDraft(String(maxValue));
  }, [maxFocused, maxValue]);

  const validationError = useMemo(() => {
    if (minDraft.trim() === "" || maxDraft.trim() === "") {
      return "Inserisci sia il prezzo minimo sia quello massimo.";
    }

    const parsedMin = parseBudget(minDraft);
    const parsedMax = parseBudget(maxDraft);

    if (parsedMin === null || parsedMax === null) {
      return "Inserisci solo valori numerici.";
    }

    if (parsedMax < parsedMin) {
      return "Il prezzo massimo deve essere maggiore o uguale al minimo.";
    }

    return null;
  }, [maxDraft, minDraft]);

  function commitDrafts(nextMinDraft: string, nextMaxDraft: string) {
    const parsedMin = parseBudget(nextMinDraft);
    const parsedMax = parseBudget(nextMaxDraft);

    if (parsedMin === null || parsedMax === null || parsedMax < parsedMin) {
      return;
    }

    onChange(normalizeRange(parsedMin, parsedMax));
  }

  function handleMinInputChange(raw: string) {
    const nextDraft = raw.replace(/\D/g, "");
    setMinDraft(nextDraft);
  }

  function handleMaxInputChange(raw: string) {
    const nextDraft = raw.replace(/\D/g, "");
    setMaxDraft(nextDraft);
  }

  function stepMin(delta: number) {
    const next = normalizeRange(Math.min(minValue + delta, maxValue), maxValue);
    onChange(next);
    setMinDraft(String(next[0]));
  }

  function stepMax(delta: number) {
    const next = normalizeRange(minValue, Math.max(maxValue + delta, minValue));
    onChange(next);
    setMaxDraft(String(next[1]));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-primary-black/60">
            Minimo budget (€)
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minDraft}
            onChange={(e) => handleMinInputChange(e.target.value)}
            onFocus={() => setMinFocused(true)}
            onBlur={() => {
              setMinFocused(false);
              commitDrafts(minDraft, maxDraft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                stepMin(EXPLORE_PRICE_STEP);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                stepMin(-EXPLORE_PRICE_STEP);
              }
            }}
            placeholder={String(EXPLORE_PRICE_MIN)}
            aria-label="Budget minimo location"
            className={inputClassName}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-primary-black/60">
            Massimo budget (€)
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxDraft}
            onChange={(e) => handleMaxInputChange(e.target.value)}
            onFocus={() => setMaxFocused(true)}
            onBlur={() => {
              setMaxFocused(false);
              commitDrafts(minDraft, maxDraft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                stepMax(EXPLORE_PRICE_STEP);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                stepMax(-EXPLORE_PRICE_STEP);
              }
            }}
            placeholder="Es. 5000"
            aria-label="Budget massimo location"
            className={inputClassName}
          />
        </label>
      </div>

      <p className="text-xs leading-relaxed text-primary-black/50">
        Inserisci la fascia di budget che preferisci per evento o pacchetto
        location. Il costo indicato si riferisce alla base della sala e{" "}
        <span className="underline decoration-primary-black/30 underline-offset-2">
          non include eventuali servizi aggiuntivi per la festa
        </span>{" "}
        (DJ, catering, decorazioni, ecc.).
      </p>
      {validationError && (
        <p className="text-xs font-semibold text-red-500">{validationError}</p>
      )}
    </div>
  );
}
