"use client";

import { getCountdown, getEventDateTime } from "@/lib/event";
import type { UserEvent } from "@/types/event";
import { useEffect, useMemo, useState } from "react";

interface EventCountdownProps {
  event: UserEvent;
  /** Flat section style for embedding inside event cards */
  embedded?: boolean;
  /** Pause ticking when the host screen is not active */
  active?: boolean;
}

export function EventCountdown({
  event,
  embedded = false,
  active = true,
}: EventCountdownProps) {
  const target = useMemo(() => getEventDateTime(event), [event]);
  const [countdown, setCountdown] = useState(() => getCountdown(target));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => setCountdown(getCountdown(target));
    const start = () => {
      tick();
      interval = setInterval(tick, 1000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const canRun =
      active &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible";

    if (canRun) start();

    const onVisibility = () => {
      if (active && document.visibilityState === "visible") {
        if (!interval) start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [target, active]);

  if (countdown.isPast) {
    return (
      <section
        className={
          embedded
            ? "min-w-0 overflow-hidden border-t border-primary-black/8 bg-primary-black/[0.03] px-3 py-4 text-center sm:px-4"
            : "rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] p-5 text-center"
        }
      >
        <p className="text-sm font-medium text-primary-black/60">
          L&apos;evento è passato
        </p>
        {!embedded && (
          <>
            <p className="mt-1 text-lg font-bold text-primary-black">
              {event.title}
            </p>
            <p className="mt-2 text-xs text-brand-teal">
              Puoi richiedere un rimborso per i servizi non soddisfacenti
            </p>
          </>
        )}
      </section>
    );
  }

  const units = [
    { value: countdown.days, label: "Giorni" },
    { value: countdown.hours, label: "Ore" },
    { value: countdown.minutes, label: "Min" },
    { value: countdown.seconds, label: "Sec" },
  ];

  return (
    <section
      className={
        embedded
          ? "min-w-0 overflow-hidden border-t border-brand-teal/25 bg-gradient-to-br from-brand-teal/10 to-brand-pink/10 px-3 py-4 sm:px-4"
          : "rounded-2xl border border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 to-brand-pink/10 p-5"
      }
    >
      <p
        className={
          embedded
            ? "text-sm font-medium text-primary-black"
            : "text-center text-xs font-semibold uppercase tracking-widest text-brand-teal"
        }
      >
        {embedded ? "Manca all'evento" : "Countdown all'evento"}
      </p>
      {embedded && (
        <p className="mt-0.5 text-xs text-primary-black/55">
          Aggiornato in tempo reale
        </p>
      )}

      <div
        className={
          embedded
            ? "mt-3 grid grid-cols-4 gap-1.5 sm:gap-2"
            : "mt-4 grid grid-cols-4 gap-1.5 sm:gap-2"
        }
      >
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center rounded-xl bg-background py-2.5 sm:py-3"
          >
            <span className="text-xl font-bold tabular-nums text-primary-black sm:text-2xl">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase text-primary-black/50">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
