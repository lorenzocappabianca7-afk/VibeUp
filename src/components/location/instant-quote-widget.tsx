"use client";

import { calculateHours } from "@/lib/location";
import { cn, formatCurrency } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

interface InstantQuoteWidgetProps {
  hourlyPrice: number;
  minHours: number;
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export function InstantQuoteWidget({
  hourlyPrice,
  minHours,
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: InstantQuoteWidgetProps) {
  const hours = calculateHours(startTime, endTime);
  const locationCost = hours * hourlyPrice;
  const isValidDuration = hours >= minHours;
  const hasTimeError = startTime && endTime && hours === 0;

  const today = new Date().toISOString().split("T")[0];

  return (
    <section className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-brand-teal" aria-hidden />
        <h2 className="text-base font-bold text-primary-black">
          Preventivo Istantaneo
        </h2>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary-black/60">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Data evento
          </span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-primary-black/60">
              Ora inizio
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-primary-black/60">
              Ora fine
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
          </label>
        </div>

        {hasTimeError && (
          <p className="text-xs text-brand-pink">
            L&apos;orario di fine deve essere successivo all&apos;inizio.
          </p>
        )}

        {hours > 0 && !isValidDuration && (
          <p className="text-xs text-brand-pink">
            Durata minima richiesta: {minHours} ore.
          </p>
        )}

        <div
          className={cn(
            "rounded-xl bg-background p-4",
            hours > 0 && isValidDuration
              ? "border border-brand-teal/30"
              : "border border-primary-black/10",
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary-black/60">
              {hours > 0
                ? `Affitto sala stimato per ${hours} ore`
                : "Seleziona orari per il preventivo"}
            </span>
            <span className="font-bold text-brand-teal">
              {hours > 0 ? formatCurrency(locationCost) : "—"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
