"use client";

import {
  DEMO_SPEED_AZZURRO,
  demoBookingDurationMs,
  formatDemoDuration,
  pad2,
} from "@/lib/demo/booking-speed";
import { Zap } from "lucide-react";
import { useMemo, useState } from "react";

export function DemoBookingSpeedCard({
  firstName,
  startedAt,
  endedAt,
}: {
  firstName: string;
  startedAt: string;
  endedAt: string | null;
}) {
  const [frozenNow] = useState(() => new Date().toISOString());
  const duration = useMemo(() => {
    const ms = demoBookingDurationMs(startedAt, endedAt ?? frozenNow);
    return ms === null ? null : formatDemoDuration(ms);
  }, [endedAt, frozenNow, startedAt]);

  if (!duration) return null;

  const name = firstName.trim();
  const greeting = name ? `${name}, con noi` : "Con noi";
  const underOneHour = duration.hours === 0;
  const major = underOneHour ? duration.minutes : duration.hours;
  const minor = underOneHour ? duration.seconds : duration.minutes;
  const majorUnit = underOneHour ? "min" : "h";
  const minorUnit = underOneHour ? "sec" : "min";

  return (
    <section
      className="mt-6 overflow-hidden rounded-3xl border px-5 py-6 text-center shadow-[0_18px_40px_-24px_rgba(94,200,255,0.85)]"
      style={{
        borderColor: "rgba(94, 200, 255, 0.35)",
        background:
          "linear-gradient(180deg, rgba(94, 200, 255, 0.16) 0%, rgba(26, 28, 33, 0.92) 100%)",
      }}
    >
      <p
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em]"
        style={{ color: DEMO_SPEED_AZZURRO }}
      >
        <Zap className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
        Prenotazione lampo
      </p>

      <div
        className="mt-4 flex items-end justify-center gap-3 tabular-nums"
        aria-label={duration.label}
      >
        <TimeBlock value={pad2(major)} unit={majorUnit} />
        <span
          className="mb-5 text-3xl font-black"
          style={{ color: DEMO_SPEED_AZZURRO }}
          aria-hidden
        >
          :
        </span>
        <TimeBlock value={pad2(minor)} unit={minorUnit} />
      </div>

      <p className="mt-5 text-base font-bold leading-snug text-primary-black">
        {greeting} ci hai messo{" "}
        <span className="whitespace-nowrap" style={{ color: DEMO_SPEED_AZZURRO }}>
          {duration.label}
        </span>
        .
      </p>
      <p className="mt-2 text-sm leading-relaxed text-primary-black/62">
        Quanto ci avresti messo da solo? Giorni di chat, chiamate e “ti faccio
        sapere” — qui l’hai chiusa in un soffio.
      </p>
    </section>
  );
}

function TimeBlock({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="flex min-w-[4.5rem] flex-col items-center">
      <span
        className="text-[2.75rem] font-black leading-none tracking-tight"
        style={{
          color: DEMO_SPEED_AZZURRO,
          textShadow: "0 0 22px rgba(94, 200, 255, 0.45)",
        }}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary-black/45">
        {unit}
      </span>
    </span>
  );
}
