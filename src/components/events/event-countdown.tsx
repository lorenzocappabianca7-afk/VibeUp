"use client";

import { getCountdown, getEventDateTime } from "@/lib/event";
import type { UserEvent } from "@/types/event";
import { useEffect, useMemo, useState } from "react";

interface EventCountdownProps {
  event: UserEvent;
}

export function EventCountdown({ event }: EventCountdownProps) {
  const target = useMemo(() => getEventDateTime(event), [event]);
  const [countdown, setCountdown] = useState(() => getCountdown(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (countdown.isPast) {
    return (
      <section className="rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] p-5 text-center">
        <p className="text-sm font-medium text-primary-black/60">
          L&apos;evento è passato
        </p>
        <p className="mt-1 text-lg font-bold text-primary-black">
          {event.title}
        </p>
        <p className="mt-2 text-xs text-brand-teal">
          Puoi richiedere un rimborso per i servizi non soddisfacenti
        </p>
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
    <section className="rounded-2xl border border-brand-teal/20 bg-gradient-to-br from-brand-teal/10 to-brand-pink/10 p-5">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-teal">
        Countdown all&apos;evento
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center rounded-xl bg-background py-3"
          >
            <span className="text-2xl font-bold tabular-nums text-primary-black">
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
