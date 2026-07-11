"use client";

import {
  EXPLORE_GUEST_MAX,
  EXPLORE_GUEST_MIN,
  EXPLORE_GUEST_STEP,
} from "@/types/location";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

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
  const atMin = value <= EXPLORE_GUEST_MIN;
  const atMax = value >= EXPLORE_GUEST_MAX;

  function handleInputChange(raw: string) {
    if (raw.trim() === "") return;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      onChange(clampGuestCount(parsed));
    }
  }

  function decrement() {
    if (!atMin) {
      onChange(Math.max(EXPLORE_GUEST_MIN, value - EXPLORE_GUEST_STEP));
    }
  }

  function increment() {
    if (!atMax) {
      onChange(Math.min(EXPLORE_GUEST_MAX, value + EXPLORE_GUEST_STEP));
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] px-4 py-3",
        className,
      )}
    >
      <span className="text-sm font-semibold text-primary-black">Invitati</span>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={decrement}
          disabled={atMin}
          aria-label="Riduci numero invitati"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
            atMin
              ? "cursor-not-allowed border-primary-black/10 text-primary-black/25"
              : "border-brand-pink bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20",
          )}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={EXPLORE_GUEST_MIN}
          max={EXPLORE_GUEST_MAX}
          step={EXPLORE_GUEST_STEP}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          aria-label="Numero invitati"
          className="min-w-[3.5rem] max-w-[4.5rem] bg-transparent text-center text-lg font-bold tabular-nums text-primary-black focus:outline-none focus:ring-2 focus:ring-brand-teal/20 rounded-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={increment}
          disabled={atMax}
          aria-label="Aumenta numero invitati"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
            atMax
              ? "cursor-not-allowed border-primary-black/10 text-primary-black/25"
              : "border-brand-pink bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
