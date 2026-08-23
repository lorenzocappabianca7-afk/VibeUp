"use client";

import {
  EXPLORE_GUEST_MAX,
  EXPLORE_GUEST_MIN,
  EXPLORE_GUEST_STEP,
} from "@/types/location";
import {
  collapseCaret,
  NUMERIC_FIELD_INPUT_PROPS,
  scheduleCollapseCaret,
} from "@/lib/numeric-field";
import { HoldStepButton } from "@/components/ui/hold-step-button";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export type GuestCountStepperHandle = {
  commit: () => number;
};

interface GuestCountStepperProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  autoFocus?: boolean;
  ref?: Ref<GuestCountStepperHandle>;
}

function clampGuestCount(value: number) {
  return Math.min(EXPLORE_GUEST_MAX, Math.max(EXPLORE_GUEST_MIN, value));
}

export function GuestCountStepper({
  value,
  onChange,
  className,
  autoFocus = false,
  ref,
}: GuestCountStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const atMin = value <= EXPLORE_GUEST_MIN;
  const atMax = value >= EXPLORE_GUEST_MAX;
  const visible = focused ? draft : String(value);

  useEffect(() => {
    if (!autoFocus) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    collapseCaret(node);
  }, [autoFocus]);

  function commitDraft(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      onChange(EXPLORE_GUEST_MIN);
      setDraft(String(EXPLORE_GUEST_MIN));
      return EXPLORE_GUEST_MIN;
    }

    const parsed = Number.parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return value;
    }

    const next = clampGuestCount(parsed);
    onChange(next);
    setDraft(String(next));
    return next;
  }

  useImperativeHandle(ref, () => ({
    commit: () => commitDraft(focused ? draft : String(value)),
  }));

  function stepBy(delta: number) {
    const current = valueRef.current;
    const next = clampGuestCount(current + delta);
    if (next === current) return;
    valueRef.current = next;
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div
      className={cn(
        "vibeup-guest-stepper min-w-0 w-full rounded-2xl border border-primary-black/10 bg-paper px-4 py-3",
        className,
      )}
      onSelectStart={(event) => event.preventDefault()}
    >
      <label className="block text-sm font-semibold text-ink-inverse">
        Invitati
      </label>
      <p className="mt-0.5 text-[11px] font-medium text-ink-inverse/50">
        Tocca il campo e digita il numero esatto
      </p>

      <div className="mt-3 flex items-center gap-3">
        <HoldStepButton
          label="Riduci numero invitati"
          disabled={atMin}
          onStep={() => stepBy(-EXPLORE_GUEST_STEP)}
          className={cn(
            "touch-target touch-feedback flex shrink-0 items-center justify-center rounded-full transition-colors",
            atMin
              ? "cursor-not-allowed bg-ink-inverse/10 text-ink-inverse/25"
              : "bg-brand-pink text-ink-inverse hover:bg-brand-pink/90",
          )}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </HoldStepButton>

        <input
          ref={inputRef}
          {...NUMERIC_FIELD_INPUT_PROPS}
          value={visible}
          onFocus={(event) => {
            const node = event.currentTarget;
            setFocused(true);
            setDraft(String(value));
            scheduleCollapseCaret(node);
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
          onChange={(event) => {
            setDraft(event.target.value.replace(/\D/g, ""));
          }}
          onBlur={() => {
            commitDraft(draft);
            setFocused(false);
          }}
          aria-label="Numero invitati"
          size={1}
          className="vibeup-light-field vibeup-numeric-field h-12 w-0 min-w-0 flex-1 rounded-xl bg-paper-deep text-center text-2xl font-black tabular-nums text-ink-inverse outline-none ring-1 ring-primary-black/10 focus:ring-2 focus:ring-brand-teal/40"
          style={{ colorScheme: "light" }}
        />

        <HoldStepButton
          label="Aumenta numero invitati"
          disabled={atMax}
          onStep={() => stepBy(EXPLORE_GUEST_STEP)}
          className={cn(
            "touch-target touch-feedback flex shrink-0 items-center justify-center rounded-full transition-colors",
            atMax
              ? "cursor-not-allowed bg-ink-inverse/10 text-ink-inverse/25"
              : "bg-brand-teal text-ink-inverse hover:bg-brand-teal-strong",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </HoldStepButton>
      </div>
      <p className="mt-2 text-center text-[10px] font-medium text-ink-inverse/40">
        ±1 a tap · tieni premuto per accelerare
      </p>
    </div>
  );
}
