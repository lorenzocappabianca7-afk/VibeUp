"use client";

import {
  EXPLORE_GUEST_MAX,
  EXPLORE_GUEST_MIN,
  EXPLORE_GUEST_STEP,
} from "@/types/location";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

interface GuestCountStepperProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function clampGuestCount(value: number) {
  return Math.min(EXPLORE_GUEST_MAX, Math.max(EXPLORE_GUEST_MIN, value));
}

export function GuestCountStepper({
  value,
  onChange,
  className,
}: GuestCountStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const atMin = value <= EXPLORE_GUEST_MIN;
  const atMax = value >= EXPLORE_GUEST_MAX;
  const visible = focused ? draft : String(value);

  function commitDraft(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      onChange(EXPLORE_GUEST_MIN);
      setDraft(String(EXPLORE_GUEST_MIN));
      return;
    }

    const parsed = Number.parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }

    const next = clampGuestCount(parsed);
    onChange(next);
    setDraft(String(next));
  }

  function decrement() {
    if (!atMin) {
      const next = Math.max(EXPLORE_GUEST_MIN, value - EXPLORE_GUEST_STEP);
      onChange(next);
      setDraft(String(next));
    }
  }

  function increment() {
    if (!atMax) {
      const next = Math.min(EXPLORE_GUEST_MAX, value + EXPLORE_GUEST_STEP);
      onChange(next);
      setDraft(String(next));
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-primary-black/10 bg-white px-4 py-3",
        className,
      )}
    >
      <span className="text-sm font-semibold text-ink-inverse">Invitati</span>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={decrement}
          disabled={atMin}
          aria-label="Riduci numero invitati"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            atMin
              ? "cursor-not-allowed bg-ink-inverse/10 text-ink-inverse/25"
              : "bg-brand-pink text-ink-inverse hover:bg-brand-pink/90",
          )}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={visible}
          onFocus={() => {
            setFocused(true);
            setDraft(String(value));
          }}
          onChange={(event) => {
            setDraft(event.target.value.replace(/\D/g, ""));
          }}
          onBlur={() => {
            commitDraft(draft);
            setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label="Numero invitati"
          className="min-w-[3.5rem] max-w-[4.5rem] rounded-lg bg-transparent text-center text-base font-bold tabular-nums text-ink-inverse focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
        />

        <button
          type="button"
          onClick={increment}
          disabled={atMax}
          aria-label="Aumenta numero invitati"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            atMax
              ? "cursor-not-allowed bg-ink-inverse/10 text-ink-inverse/25"
              : "bg-brand-teal text-ink-inverse hover:bg-brand-teal-strong",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
