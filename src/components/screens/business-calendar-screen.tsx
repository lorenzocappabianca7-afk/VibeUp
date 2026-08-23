"use client";

import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { listingsForBusiness } from "@/lib/manager-listings";
import {
  managerEventsFromRequests,
  upcomingManagerEvents,
  type ManagerEventStatus,
  type ManagerVenueEvent,
} from "@/lib/manager-venue-events";
import { MOCK_BUSINESS_CONFIRMED_EVENTS } from "@/lib/mock/business-inbox";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
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

function statusTone(status: ManagerEventStatus) {
  if (status === "confirmed") return "bg-brand-teal/15 text-brand-teal";
  if (status === "awaiting_guest") return "bg-amber-400/15 text-amber-200";
  if (status === "cancelled") return "bg-brand-pink/15 text-brand-pink";
  return "bg-white/8 text-primary-black/70";
}

function eventsFromMocks(): ManagerVenueEvent[] {
  return MOCK_BUSINESS_CONFIRMED_EVENTS.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    guestCount: event.guestCount,
    organizerName: event.organizerName,
    locationName: "Locale di esempio",
    locationId: "demo",
    status: "confirmed",
    statusLabel: "Confermato",
    totalCost: 0,
    notes: event.notes,
  }));
}

export const BusinessCalendarScreen = memo(function BusinessCalendarScreen() {
  const { businessProfile, currentUser, managedListings } = useAppState();
  const { managedRequests } = useAvailabilityRequests();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const todayIso = toIsoDate(new Date());
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const venues = useMemo(
    () =>
      listingsForBusiness(managedListings, {
        email: currentUser.email,
        businessName: businessProfile?.businessName,
      }).map((listing) => listing.location),
    [businessProfile?.businessName, currentUser.email, managedListings],
  );

  const liveEvents = useMemo(
    () => managerEventsFromRequests(managedRequests),
    [managedRequests],
  );

  const allEvents = useMemo(() => {
    if (liveEvents.length > 0) return liveEvents;
    return eventsFromMocks();
  }, [liveEvents]);

  const usingDemo = liveEvents.length === 0;
  const filteredEvents = useMemo(() => {
    if (locationFilter === "all") return allEvents;
    return allEvents.filter((event) => event.locationId === locationFilter);
  }, [allEvents, locationFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ManagerVenueEvent[]>();
    for (const event of filteredEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [filteredEvents]);

  const eventDates = useMemo(() => new Set(eventsByDate.keys()), [eventsByDate]);

  const listedEvents = useMemo(() => {
    const source = selectedDate
      ? (eventsByDate.get(selectedDate) ?? [])
      : upcomingManagerEvents(filteredEvents);
    return [...source];
  }, [eventsByDate, filteredEvents, selectedDate]);

  const tableEvents = useMemo(
    () =>
      [...filteredEvents].sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        return dateCmp !== 0 ? dateCmp : a.startTime.localeCompare(b.startTime);
      }),
    [filteredEvents],
  );

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
          Eventi associati
          {businessProfile?.businessName
            ? ` a ${businessProfile.businessName}`
            : " ai tuoi locali"}
        </p>
      </header>

      {venues.length > 1 ? (
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-primary-black/45">
            Locale
          </span>
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            className="w-full rounded-2xl border border-primary-black/10 bg-surface px-3 py-2.5 text-sm font-semibold text-primary-black outline-none focus:border-brand-teal"
          >
            <option value="all">Tutti i locali</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {usingDemo ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-primary-black/55">
          Ancora nessuna richiesta sul tuo locale. Qui sotto vedi esempi di come
          appariranno gli eventi confermati.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[1.35rem] border border-primary-black/10 bg-surface">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="text-sm font-black text-primary-black">
            Tabella eventi
          </h2>
          <p className="mt-0.5 text-xs text-primary-black/50">
            {tableEvents.length} eventi collegati al locale
          </p>
        </div>
        {tableEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[36rem] w-full text-left text-xs">
              <thead className="bg-background/70 text-[10px] font-black uppercase tracking-wide text-primary-black/45">
                <tr>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Evento</th>
                  <th className="px-3 py-2.5">Ospiti</th>
                  <th className="px-3 py-2.5">Organizzatore</th>
                  <th className="px-3 py-2.5">Stato</th>
                </tr>
              </thead>
              <tbody>
                {tableEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t border-white/6 text-primary-black"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {formatEventDay(event.date)}
                      <span className="mt-0.5 block text-[11px] font-medium text-primary-black/50">
                        {event.startTime}–{event.endTime}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-[11px] text-primary-black/50">
                        {event.locationName}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {event.guestCount}
                    </td>
                    <td className="px-3 py-2.5">{event.organizerName}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          statusTone(event.status),
                        )}
                      >
                        {event.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <CalendarDays
              className="mx-auto h-8 w-8 text-primary-black/30"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-primary-black">
              Nessun evento associato
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Quando un organizzatore invia una richiesta, la trovi qui.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[1.35rem] border border-primary-black/10 bg-surface p-4">
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
                    ? "bg-white/12 text-primary-black"
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
                      isSelected ? "bg-surface" : "bg-brand-pink",
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
              : "Prossimi eventi"}
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
                <article className="rounded-2xl border border-primary-black/10 bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary-black">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-primary-black/55">
                        {formatEventDay(event.date)} · {event.startTime}–
                        {event.endTime}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        statusTone(event.status),
                      )}
                    >
                      {event.statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-primary-black/60">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {event.guestCount} ospiti
                    </span>
                    <span>Organizzatore: {event.organizerName}</span>
                    {event.totalCost > 0 ? (
                      <span>{formatCurrency(event.totalCost)}</span>
                    ) : null}
                  </div>
                </article>
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
              Gli eventi confermati e le richieste in corso appariranno qui.
            </p>
          </div>
        )}
      </section>
    </div>
  );
});
