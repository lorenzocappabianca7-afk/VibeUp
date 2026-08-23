"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

function useHoldRepeat(step: () => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
  }

  function start() {
    stop();
    stepRef.current();

    let intervalMs = 140;
    let intervalId = 0;
    const delayId = window.setTimeout(() => {
      const tick = () => {
        stepRef.current();
        intervalMs = Math.max(36, Math.round(intervalMs * 0.82));
        intervalId = window.setTimeout(tick, intervalMs);
      };
      intervalId = window.setTimeout(tick, intervalMs);
    }, 380);

    const end = () => stop();
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    stopRef.current = () => {
      window.clearTimeout(delayId);
      window.clearTimeout(intervalId);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopRef.current = null;
    };
  }

  return { start, stop };
}

interface HoldStepButtonProps {
  label: string;
  disabled: boolean;
  className?: string;
  onStep: () => void;
  children: ReactNode;
}

/** +/- control: one step on tap, accelerating repeat on press-and-hold. */
export function HoldStepButton({
  label,
  disabled,
  className,
  onStep,
  children,
}: HoldStepButtonProps) {
  const { start, stop } = useHoldRepeat(onStep);
  const pointerStartedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    const blockNativeCallout = (event: TouchEvent) => {
      if (node.disabled) return;
      event.preventDefault();
    };

    node.addEventListener("touchstart", blockNativeCallout, { passive: false });
    return () => {
      node.removeEventListener("touchstart", blockNativeCallout);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-label={label}
      draggable={false}
      onPointerDown={(event) => {
        if (disabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Some environments have no active pointer to capture.
        }
        pointerStartedRef.current = true;
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      onSelectStart={(event) => event.preventDefault()}
      onClick={() => {
        if (pointerStartedRef.current) {
          pointerStartedRef.current = false;
          return;
        }
        if (!disabled) onStep();
      }}
      className={cn("vibeup-hold-step select-none touch-manipulation", className)}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {children}
    </button>
  );
}
