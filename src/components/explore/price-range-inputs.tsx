"use client";

import { cn } from "@/lib/utils";
import {
  EXPLORE_PRICE_MAX,
  EXPLORE_PRICE_MIN,
  EXPLORE_PRICE_STEP,
} from "@/types/location";
import { useEffect, useMemo, useState } from "react";

interface PriceRangeInputsProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRange(min: number, max: number): [number, number] {
  const clampedMin = clamp(min, EXPLORE_PRICE_MIN, EXPLORE_PRICE_MAX);
  const clampedMax = clamp(max, EXPLORE_PRICE_MIN, EXPLORE_PRICE_MAX);
  return [clampedMin, clampedMax];
}

const inputClassName =
  "w-full rounded-2xl border border-primary-black/10 bg-background px-3.5 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

export function PriceRangeInputs({
  value,
  onChange,
  className,
}: PriceRangeInputsProps) {
  const [minValue, maxValue] = value;
  const [minDraft, setMinDraft] = useState(String(minValue));
  const [maxDraft, setMaxDraft] = useState(String(maxValue));

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMinDraft(String(minValue));
      setMaxDraft(String(maxValue));
    });

    return () => {
      cancelled = true;
    };
  }, [minValue, maxValue]);

  const validationError = useMemo(() => {
    if (minDraft.trim() === "" || maxDraft.trim() === "") {
      return "Inserisci sia il prezzo minimo sia quello massimo.";
    }

    const parsedMin = Number.parseInt(minDraft, 10);
    const parsedMax = Number.parseInt(maxDraft, 10);

    if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax)) {
      return "Inserisci solo valori numerici.";
    }

    if (parsedMax < parsedMin) {
      return "Il prezzo massimo deve essere maggiore o uguale al minimo.";
    }

    return null;
  }, [maxDraft, minDraft]);

  function updateDraft(nextMin: string, nextMax: string) {
    const parsedMin = Number.parseInt(nextMin, 10);
    const parsedMax = Number.parseInt(nextMax, 10);

    if (
      nextMin.trim() !== "" &&
      nextMax.trim() !== "" &&
      !Number.isNaN(parsedMin) &&
      !Number.isNaN(parsedMax) &&
      parsedMax >= parsedMin
    ) {
      onChange(normalizeRange(parsedMin, parsedMax));
    }
  }

  function handleMinInputChange(raw: string) {
    setMinDraft(raw);
    updateDraft(raw, maxDraft);
  }

  function handleMaxInputChange(raw: string) {
    setMaxDraft(raw);
    updateDraft(minDraft, raw);
  }

  function stepMin(delta: number) {
    onChange(normalizeRange(Math.min(minValue + delta, maxValue), maxValue));
  }

  function stepMax(delta: number) {
    onChange(normalizeRange(minValue, Math.max(maxValue + delta, minValue)));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-primary-black/60">
            Minimo budget (€)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={EXPLORE_PRICE_MIN}
            max={EXPLORE_PRICE_MAX}
            step={EXPLORE_PRICE_STEP}
            value={minDraft}
            onChange={(e) => handleMinInputChange(e.target.value)}
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
            type="number"
            inputMode="numeric"
            min={EXPLORE_PRICE_MIN}
            max={EXPLORE_PRICE_MAX}
            step={EXPLORE_PRICE_STEP}
            value={maxDraft}
            onChange={(e) => handleMaxInputChange(e.target.value)}
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
            placeholder={String(EXPLORE_PRICE_MAX)}
            aria-label="Budget massimo location"
            className={inputClassName}
          />
        </label>
      </div>

      <p className="text-xs leading-relaxed text-primary-black/50">
        Fascia da {EXPLORE_PRICE_MIN}€ a {EXPLORE_PRICE_MAX}€ per evento o
        pacchetto location. Il costo indicato si riferisce alla base della sala e{" "}
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
