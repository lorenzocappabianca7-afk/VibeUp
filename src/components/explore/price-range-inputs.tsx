"use client";

import {
  collapseCaret,
  NUMERIC_FIELD_INPUT_PROPS,
  scheduleCollapseCaret,
} from "@/lib/numeric-field";
import { cn } from "@/lib/utils";
import {
  EXPLORE_PRICE_MIN,
  EXPLORE_PRICE_STEP,
} from "@/types/location";
import { useImperativeHandle, useMemo, useState, type Ref } from "react";

export type PriceRangeInputsHandle = {
  commit: () => [number, number] | null;
};

interface PriceRangeInputsProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
  ref?: Ref<PriceRangeInputsHandle>;
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
  "vibeup-light-field vibeup-numeric-field w-full min-w-0 rounded-2xl border border-primary-black/10 bg-paper px-3.5 py-3 text-base text-ink-inverse placeholder:text-ink-inverse/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

export function PriceRangeInputs({
  value,
  onChange,
  className,
  ref,
}: PriceRangeInputsProps) {
  const [minValue, maxValue] = value;
  const [minDraft, setMinDraft] = useState(String(minValue));
  const [maxDraft, setMaxDraft] = useState(String(maxValue));
  const [minFocused, setMinFocused] = useState(false);
  const [maxFocused, setMaxFocused] = useState(false);

  const visibleMinDraft = minFocused ? minDraft : String(minValue);
  const visibleMaxDraft = maxFocused ? maxDraft : String(maxValue);

  const validationError = useMemo(() => {
    if (visibleMinDraft.trim() === "" || visibleMaxDraft.trim() === "") {
      return "Inserisci sia il prezzo minimo sia quello massimo.";
    }

    const parsedMin = parseBudget(visibleMinDraft);
    const parsedMax = parseBudget(visibleMaxDraft);

    if (parsedMin === null || parsedMax === null) {
      return "Inserisci solo valori numerici.";
    }

    if (parsedMax < parsedMin) {
      return "Il prezzo massimo deve essere maggiore o uguale al minimo.";
    }

    return null;
  }, [visibleMaxDraft, visibleMinDraft]);

  function commitDrafts(nextMinDraft: string, nextMaxDraft: string) {
    const parsedMin = parseBudget(nextMinDraft);
    const parsedMax = parseBudget(nextMaxDraft);

    if (parsedMin === null || parsedMax === null || parsedMax < parsedMin) {
      return null;
    }

    const next = normalizeRange(parsedMin, parsedMax);
    onChange(next);
    setMinDraft(String(next[0]));
    setMaxDraft(String(next[1]));
    return next;
  }

  useImperativeHandle(ref, () => ({
    commit: () => {
      const range = commitDrafts(
        minFocused ? minDraft : String(minValue),
        maxFocused ? maxDraft : String(maxValue),
      );
      if (range) {
        setMinFocused(false);
        setMaxFocused(false);
      }
      return range;
    },
  }));

  function handleMinInputChange(raw: string) {
    setMinDraft(raw.replace(/\D/g, ""));
  }

  function handleMaxInputChange(raw: string) {
    setMaxDraft(raw.replace(/\D/g, ""));
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
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-medium text-primary-black/70">
            Minimo budget (€)
          </span>
          <input
            {...NUMERIC_FIELD_INPUT_PROPS}
            value={visibleMinDraft}
            onChange={(e) => handleMinInputChange(e.target.value)}
            onFocus={(event) => {
              setMinDraft(String(minValue));
              setMinFocused(true);
              scheduleCollapseCaret(event.currentTarget);
            }}
            onMouseUp={(event) => {
              event.preventDefault();
              collapseCaret(event.currentTarget);
            }}
            onSelect={(event) => {
              const node = event.currentTarget;
              if (node.selectionStart !== node.selectionEnd) {
                collapseCaret(node);
              }
            }}
            onBlur={() => {
              setMinFocused(false);
              commitDrafts(minDraft, maxFocused ? maxDraft : String(maxValue));
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
            style={{ colorScheme: "light" }}
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-medium text-primary-black/70">
            Massimo budget (€)
          </span>
          <input
            {...NUMERIC_FIELD_INPUT_PROPS}
            value={visibleMaxDraft}
            onChange={(e) => handleMaxInputChange(e.target.value)}
            onFocus={(event) => {
              setMaxDraft(String(maxValue));
              setMaxFocused(true);
              scheduleCollapseCaret(event.currentTarget);
            }}
            onMouseUp={(event) => {
              event.preventDefault();
              collapseCaret(event.currentTarget);
            }}
            onSelect={(event) => {
              const node = event.currentTarget;
              if (node.selectionStart !== node.selectionEnd) {
                collapseCaret(node);
              }
            }}
            onBlur={() => {
              setMaxFocused(false);
              commitDrafts(minFocused ? minDraft : String(minValue), maxDraft);
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
            placeholder="Es. 3000"
            aria-label="Budget massimo location"
            className={inputClassName}
            style={{ colorScheme: "light" }}
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
