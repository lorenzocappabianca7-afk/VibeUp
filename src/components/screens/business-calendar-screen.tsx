"use client";

import {
  MOCK_BUSINESS_CONFIRMED_EVENTS,
  type BusinessConfirmedEvent,
} from "@/lib/mock/business-inbox";
import { useAppState } from "@/context/app-state-context";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { memo, useMemo, useState } from "react";

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

function formatEventDay(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00`));
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

function EventCard({ event }: { event: BusinessConfirmedEvent }) {
  return (
    <article className="rounded-2xl border border-primary-black/10 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-black">{event.title}</p>
          <p className="mt-0.5 text-xs text-primary-black/55">
            {formatEventDay(event.date)} · {event.startTime}–{event.endTime}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-teal/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal">
          Confermato
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-primary-black/60">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {event.guestCount} ospiti
        </span>
        <span>Organizzatore: {event.organizerName}</span>
      </div>
      {event.notes && (
        <p className="mt-2 text-xs text-primary-black/50">{event.notes}</p>
      )}
    </article>
  );
}

export const BusinessCalendarScreen = memo(function BusinessCalendarScreen() {
  const { businessProfile } = useAppState();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayIso = toIsoDate(new Date());
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, BusinessConfirmedEvent[]>();
    for (const event of MOCK_BUSINESS_CONFIRMED_EVENTS) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, []);

  const eventDates = useMemo(() => new Set(eventsByDate.keys()), [eventsByDate]);

  const listedEvents = useMemo(() => {
    const source = selectedDate
      ? (eventsByDate.get(selectedDate) ?? [])
      : MOCK_BUSINESS_CONFIRMED_EVENTS;
    return [...source].sort((a, b) => a.date.localeCompare(b.date));
  }, [eventsByDate, selectedDate]);

  function moveMonth(delta: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
    setSelectedDate(null);
  }

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-primary-black">Calendario</h1>
          <span className="rounded-md bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Pro
          </span>
        </div>
        <p className="mt-1 text-sm text-primary-black/60">
          Eventi confermati
          {businessProfile?.businessName
            ? ` per ${businessProfile.businessName}`
            : " della tua attività"}
        </p>
      </header>

      <section className="rounded-[1.35rem] border border-primary-black/10 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-black capitalize text-primary-black">
            {monthLabel(visibleMonth)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="touch-feedback flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="touch-feedback flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal"
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
            const hasEvent = eventDates.has(value);
            const isSelected = selectedDate === value;
            const isToday = value === todayIso;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSelectedDate((current) =>
                    current === value ? null : value,
                  )
                }
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-black transition-colors duration-150",
                  isSelected
                    ? "bg-primary-black text-white"
                    : hasEvent
                      ? "bg-brand-teal/15 text-brand-teal"
                      : "text-primary-black hover:bg-primary-black/[0.04]",
                  isToday && !isSelected && "ring-1 ring-brand-pink/50",
                )}
              >
                {day.getDate()}
                {hasEvent && (
                  <span
                    className={cn(
                      "mt-0.5 h-1 w-1 rounded-full",
                      isSelected ? "bg-white" : "bg-brand-pink",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary-black">
            {selectedDate
              ? `Eventi del ${formatEventDay(selectedDate)}`
              : "Prossimi eventi confermati"}
          </h2>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs font-medium text-brand-teal"
            >
              Mostra tutti
            </button>
          )}
        </div>

        {listedEvents.length > 0 ? (
          <ul className="space-y-3">
            {listedEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-black/12 bg-primary-black/[0.02] px-4 py-8 text-center">
            <CalendarDays
              className="mx-auto h-8 w-8 text-primary-black/30"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-primary-black">
              Nessun evento in questa data
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Gli eventi confermati dai clienti appariranno qui.
            </p>
          </div>
        )}
      </section>
    </div>
  );
});
