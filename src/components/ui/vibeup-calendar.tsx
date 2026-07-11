"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface VibeUpCalendarProps {
  selectedStart: string | null;
  selectedEnd?: string | null;
  onSelectDate: (value: string) => void;
  className?: string;
}

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
}

export function VibeUpCalendar({
  selectedStart,
  selectedEnd,
  onSelectDate,
  className,
}: VibeUpCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (selectedStart) return startOfMonth(new Date(selectedStart));
    return startOfMonth(new Date());
  });
  const todayIso = toIsoDate(new Date());
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  function moveMonth(delta: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  return (
    <div
      className={cn(
        "max-w-[20rem] rounded-[1.35rem] border border-primary-black/10 bg-white p-3",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black capitalize text-primary-black">
          {monthLabel(visibleMonth)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal"
            aria-label="Mese successivo"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold text-primary-black/45">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          if (!day) {
            return <span key={`empty-${index}`} aria-hidden />;
          }

          const value = toIsoDate(day);
          const isPast = value < todayIso;
          const isSelected =
            selectedStart === value || selectedEnd === value;
          const isInRange =
            selectedStart &&
            selectedEnd &&
            value > selectedStart &&
            value < selectedEnd;

          return (
            <button
              key={value}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(value)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-xs font-black transition-colors duration-150",
                !isPast && "text-primary-black",
                isPast && "cursor-not-allowed text-primary-black/18",
                isInRange && "bg-brand-teal/15 text-brand-teal",
                isSelected && "bg-primary-black text-white",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
