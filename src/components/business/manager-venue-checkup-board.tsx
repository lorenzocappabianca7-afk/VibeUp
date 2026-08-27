"use client";

import {
  checkupPercentTone,
  ManagerEventCheckup,
} from "@/components/business/manager-event-checkup";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { checkupForManagerVenueEvent } from "@/lib/manager-event-checkup";
import {
  managerEventsFromRequests,
  managerVenueEventsForDisplay,
  partyTypeLabelForEvent,
  sortManagerEventsByNearestDate,
} from "@/lib/manager-venue-events";
import { cn, formatDate } from "@/lib/utils";
import { Check, ChevronDown, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";

function percentCardClass(percent: number): string {
  const tone = checkupPercentTone(percent);
  if (tone === "complete") {
    return "border-emerald-400/45 bg-emerald-500/10";
  }
  if (tone === "low") {
    return "border-red-400/40 bg-red-500/8";
  }
  return "border-amber-400/35 bg-amber-400/8";
}

function percentTextClass(percent: number): string {
  const tone = checkupPercentTone(percent);
  if (tone === "complete") return "text-emerald-300";
  if (tone === "low") return "text-red-300";
  return "text-amber-200";
}

function percentBarClass(percent: number): string {
  const tone = checkupPercentTone(percent);
  if (tone === "complete") return "bg-emerald-400";
  if (tone === "low") return "bg-red-400";
  return "bg-amber-400";
}

export function ManagerVenueCheckupBoard() {
  const { managedRequests } = useAvailabilityRequests();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const liveEvents = useMemo(
    () => managerEventsFromRequests(managedRequests),
    [managedRequests],
  );
  const usingDemo = liveEvents.length === 0;
  const events = useMemo(
    () =>
      sortManagerEventsByNearestDate(
        managerVenueEventsForDisplay(managedRequests).filter(
          (event) => event.status !== "cancelled",
        ),
      ),
    [managedRequests],
  );

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary-black/12 bg-primary-black/[0.02] px-4 py-8 text-center">
        <ClipboardCheck
          className="mx-auto h-8 w-8 text-primary-black/30"
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium text-primary-black">
          Nessuna festa in programma
        </p>
        <p className="mt-1 text-xs text-primary-black/55">
          Quando un organizzatore invia i dati, trovi qui il recap per ogni
          evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {usingDemo ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-primary-black/55">
          Ancora nessuna festa sul tuo locale. Qui sotto vedi un esempio di come
          appariranno i recap.
        </p>
      ) : null}

      {events.map((event) => {
        const checkup = checkupForManagerVenueEvent(event);
        const expanded = expandedEventId === event.id;
        const partyType = partyTypeLabelForEvent(event.title);
        const complete = checkup.percent >= 100;

        return (
          <article
            key={event.id}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors duration-150",
              percentCardClass(checkup.percent),
            )}
          >
            <button
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left"
              aria-expanded={expanded}
              onClick={() =>
                setExpandedEventId((current) =>
                  current === event.id ? null : event.id,
                )
              }
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary-black">
                  {partyType}
                </p>
                <p className="mt-0.5 text-xs text-primary-black/55">
                  {formatDate(event.date)} · {event.startTime}–{event.endTime}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-primary-black/45">
                  {event.title}
                  {event.organizerName ? ` · ${event.organizerName}` : ""}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      percentBarClass(checkup.percent),
                    )}
                    style={{ width: `${Math.min(100, checkup.percent)}%` }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums",
                    percentTextClass(checkup.percent),
                    complete
                      ? "bg-emerald-500/20"
                      : checkup.percent < 40
                        ? "bg-red-500/20"
                        : "bg-amber-400/15",
                  )}
                >
                  {complete ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : null}
                  {checkup.percent}%
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-primary-black/40 transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
            </button>
            {expanded ? (
              <div className="border-t border-white/8 px-4 pb-4 pt-3">
                <ManagerEventCheckup checkup={checkup} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
